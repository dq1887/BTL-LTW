// Kiểm thử controller thật với mô hình dữ liệu giả lập. Không truy cập MongoDB Atlas.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const clone = x => structuredClone(x);
const emp = {_id:'emp',role:'employee',departmentId:'dep1'};
const manager = {_id:'mgr',role:'manager',departmentId:'dep1'};
const outsider = {_id:'mgr2',role:'manager',departmentId:'dep2'};
const hr = {_id:'hr',role:'admin_hr',departmentId:'dep2'};
const types = [{_id:'paid',code:'paid',isActive:true,isPaid:true},{_id:'unpaid',code:'unpaid',isActive:true,isPaid:false}];
let db, counter, payroll;
function query(value) {
  return {select(){return this},populate(){return this},sort(){return this},lean(){return Promise.resolve(clone(value))},then(resolve,reject){return Promise.resolve(clone(value)).then(resolve,reject)}};
}
function match(row, filter) {
  return Object.entries(filter).every(([key, val]) => {
    if(key==='$or')return val.some(f=>match(row,f));
    const v=row[key];
    if (val && typeof val==='object' && !(val instanceof Date)) return Object.entries(val).every(([op,x])=>op==='$in'?x.includes(v):op==='$ne'?v!==x:op==='$gte'?v>=x:op==='$lte'?v<=x:op==='$exists'?(v!==undefined)===x:false);
    return v instanceof Date && val instanceof Date ? +v===+val : v===val;
  });
}
const LeaveRequest = {
  find(f){return query(db.requests.filter(r=>match(r,f)))},findOne(f){return query(db.requests.find(r=>match(r,f))||null)},findById(id){return query(db.requests.find(r=>r._id===id)||null)},
  async create(data){const r={...data,_id:`r${++counter}`,status:'pending',updatedAt:new Date()};db.requests.push(r);return clone(r)},
  findOneAndUpdate(f,update){const r=db.requests.find(r=>match(r,f));if(!r)return query(null);Object.assign(r,update.$set,{updatedAt:new Date()});return query(r)},
  async deleteOne(f){const i=db.requests.findIndex(r=>match(r,f));if(i<0)return{deletedCount:0};db.requests.splice(i,1);return{deletedCount:1}},
};
const mock = {
  mongoose:{isValidObjectId:x=>typeof x==='string'&&!!x},
  '../models/Employee':{find:f=>query([emp,manager,outsider,hr].filter(r=>match(r,f))),findById:id=>query([emp,manager,outsider,hr].find(r=>r._id===id)||null)},
  '../models/Schedule':{find:f=>query(db.schedules.filter(r=>match(r,f)))},
  '../models/Shift':{},
  '../models/LeaveType':{find:f=>query(types.filter(r=>match(r,f))),findOne:f=>query(types.find(r=>match(r,f))||null),findById:id=>query(types.find(r=>r._id===id)||null),updateOne:async()=>({})},
  '../models/LeaveRequest':LeaveRequest,
  '../utils/payrollHelper':{recalcPayroll:async(id,month)=>{payroll.push({id,month})}},
};
const original=Module._load;
try {Module._load=function(request,...args){return Object.hasOwn(mock,request)?mock[request]:original.call(this,request,...args)};global.controller=require('../src/controllers/leaveController');} finally {Module._load=original;}
const controller=global.controller;
function schedule(date,status='published'){db.schedules.push({employeeId:emp._id,workDate:date,status,shiftId:{_id:'shift',name:'Ca sáng'}})}
function requestBody(type='paid',start='2026-11-18',end='2026-11-30'){return {leaveTypeId:type,startDate:start,endDate:end,reason:'Việc cá nhân'}}
function invoke(name,user,body={},params={},q={}){return new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(new Error(`Timeout ${name}`)),2000);
 const res={code:200,status(code){this.code=code;return this},json(data){clearTimeout(timeout);resolve({code:this.code,...data})}};
 controller[name]({user,body,params,query:q},res,err=>{clearTimeout(timeout);resolve({code:err.statusCode||500,message:err.message})});
})}
test.beforeEach(()=>{db={requests:[],schedules:[]};counter=0;payroll=[];schedule('2026-11-19');schedule('2026-11-23')});
test('tạo đơn 18–30: 13 ngày theo lịch, 2 ngày tính phép; lưu đúng loại nghỉ',async()=>{
 const r=await invoke('createLeaveRequest',emp,requestBody());assert.equal(r.code,201);assert.equal(r.data.calendarDays,13);assert.equal(r.data.totalDays,2);assert.equal(db.requests[0].leaveTypeId,'paid');
});
test('đơn chờ duyệt tính lại khi thêm lịch; không ghi DB khi chỉ xem',async()=>{
 const r=await invoke('createLeaveRequest',emp,requestBody());schedule('2026-11-24');const list=await invoke('getLeaveRequests',emp);assert.equal(list.data[0].totalDays,3);assert.equal(db.requests[0].totalDays,2);const b=await invoke('getPaidLeaveBalance',emp,{}, {}, {year:'2026'});assert.equal(b.data.remainingDays,9);assert.equal(r.code,201);
});
test('không duyệt nếu còn lịch nháp hoặc người duyệt đang xem lịch cũ',async()=>{
 const r=await invoke('createLeaveRequest',emp,requestBody());const id=r.data._id;schedule('2026-11-24','draft');assert.equal((await invoke('approveLeaveRequest',manager,{}, {id})).code,409);db.schedules.at(-1).status='published';assert.equal((await invoke('approveLeaveRequest',manager,{expectedScheduledDates:r.data.scheduledDates},{id})).code,409);assert.equal(db.requests[0].status,'pending');
});
test('duyệt đúng loại nghỉ, giữ ảnh chụp ngày, gọi cập nhật lương; thêm lịch không sửa lịch sử',async()=>{
 const r=await invoke('createLeaveRequest',emp,requestBody());const id=r.data._id;const a=await invoke('approveLeaveRequest',manager,{leaveTypeId:'unpaid',expectedScheduledDates:r.data.scheduledDates},{id});assert.equal(a.code,200);assert.equal(db.requests[0].leaveTypeId,'paid');assert.equal(db.requests[0].status,'approved');assert.deepEqual(payroll,[{id:'emp',month:'2026-11'}]);schedule('2026-11-24');const list=await invoke('getLeaveRequests',emp);assert.equal(list.data[0].totalDays,2);assert.equal(list.data[0].scheduleChanged,true);
});
test('tra số dư: nhân viên không xem người khác, manager đúng phòng, HR toàn công ty',async()=>{
 const q={year:'2026',employeeId:'emp'};assert.equal((await invoke('getPaidLeaveBalance',outsider,{}, {},q)).code,403);assert.equal((await invoke('getPaidLeaveBalance',emp,{}, {},{...q,employeeId:'mgr'})).code,403);assert.equal((await invoke('getPaidLeaveBalance',manager,{}, {},q)).code,200);assert.equal((await invoke('getPaidLeaveBalance',hr,{}, {},q)).code,200);
});
test('nghỉ có lương 13 ngày bị chặn, nghỉ không lương 13 ngày hợp lệ',async()=>{
 db.schedules=[];for(let d=1;d<=13;d++)schedule(`2026-11-${String(d).padStart(2,'0')}`);assert.equal((await invoke('createLeaveRequest',emp,requestBody('paid','2026-11-01','2026-11-13'))).code,409);assert.equal((await invoke('createLeaveRequest',emp,requestBody('unpaid','2026-11-01','2026-11-13'))).code,201);
});
test('sửa đơn và duyệt đơn đều kiểm tra hạn mức mới',async()=>{
 const r=await invoke('createLeaveRequest',emp,requestBody());for(let d=1;d<=12;d++)schedule(`2026-11-${String(d).padStart(2,'0')}`);assert.equal((await invoke('updateLeaveRequest',emp,requestBody('paid','2026-11-01','2026-11-30'),{id:r.data._id})).code,409);for(let d=18;d<=30;d++)if(![19,23].includes(d))schedule(`2026-11-${d}`);assert.equal((await invoke('approveLeaveRequest',manager,{}, {id:r.data._id})).code,409);
});
test('hai đơn đồng thời không thể giữ vượt 12 ngày trong một backend',async()=>{
 db.schedules=[];for(let d=1;d<=14;d++)schedule(`2026-11-${String(d).padStart(2,'0')}`);const results=await Promise.all([invoke('createLeaveRequest',emp,requestBody('paid','2026-11-01','2026-11-07')),invoke('createLeaveRequest',emp,requestBody('paid','2026-11-08','2026-11-14'))]);assert.deepEqual(results.map(r=>r.code).sort(),[201,409]);
});
test('từ chối giải phóng số phép đang giữ, không tự duyệt',async()=>{
 const r=await invoke('createLeaveRequest',emp,requestBody());assert.equal((await invoke('approveLeaveRequest',{...emp,role:'manager'}, {},{id:r.data._id})).code,403);assert.equal((await invoke('rejectLeaveRequest',manager,{}, {id:r.data._id})).code,200);assert.equal((await invoke('getPaidLeaveBalance',emp,{}, {},{year:'2026'})).data.remainingDays,12);
});
