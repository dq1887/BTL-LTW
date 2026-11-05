import { Types } from 'mongoose';
const models = new Map();
const text = (value) => value?.toString();
function equal(a, b) { if (a == null || b == null) return a == b; return text(a) === text(b); }
function matches(doc, query) {
  return Object.entries(query).every(([key, wanted]) => {
    if (key === '$or') return wanted.some((branch) => matches(doc, branch));
    const actual = doc[key];
    if (wanted && typeof wanted === 'object' && !Array.isArray(wanted) && Object.keys(wanted).some((item) => item.startsWith('$'))) return Object.entries(wanted).every(([op, value]) => {
      if (op === '$in') return (Array.isArray(actual) ? actual : [actual]).some((item) => value.some((candidate) => equal(item, candidate)));
      if (op === '$ne') return value === null ? actual != null : !equal(actual, value);
      if (op === '$lte') return actual <= value;
      if (op === '$gte') return actual >= value;
      if (op === '$gt') return actual > value;
      throw new Error('Query mock chưa hỗ trợ ' + op);
    });
    return Array.isArray(actual) ? actual.some((item) => equal(item, wanted)) : equal(actual, wanted);
  });
}
const copy = (value) => JSON.parse(JSON.stringify(value));
const refs = { employeeId: 'Employee', leaveTypeId: 'LeaveType', reviewerId: 'User', 'history.actorId': 'User' };
class Query {
  constructor(run) { this.run = run; this.paths = []; }
  session() { return this; }
  select() { return this; }
  populate(path) { this.paths.push(path); return this; }
  sort(spec) { this.order = spec; return this; }
  distinct(key) { return Promise.resolve(this.run()).then((rows) => [...new Set(rows.map((row) => row[key]))]); }
  async exec() {
    let data = await this.run();
    if (this.order && Array.isArray(data)) data = [...data].sort((a, b) => { for (const [key, direction] of Object.entries(this.order)) { const result = text(a[key]).localeCompare(text(b[key])); if (result) return result * direction; } return 0; });
    if (!this.paths.length) return data;
    const fill = (row) => {
      if (!row) return row;
      const result = copy(row);
      for (const path of this.paths) {
        const target = models.get(refs[path]);
        const find = (id) => { const doc = target.rows.find((item) => equal(item._id, id)); return doc ? copy(doc) : null; };
        if (path === 'history.actorId') result.history = result.history.map((item) => ({ ...item, actorId: find(item.actorId) }));
        else result[path] = find(result[path]);
      }
      return result;
    };
    return Array.isArray(data) ? data.map(fill) : fill(data);
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
}
export function makeModel(name) {
  if (models.has(name)) return models.get(name);
  const model = { rows: [],
    find: (query = {}) => new Query(() => model.rows.filter((row) => matches(row, query))),
    findById: (id) => new Query(() => model.rows.find((row) => equal(row._id, id)) ?? null),
    findOne: (query) => new Query(() => model.rows.find((row) => matches(row, query)) ?? null),
    exists: (query) => new Query(() => { const row = model.rows.find((row) => matches(row, query)); return row ? { _id: row._id } : null; }),
    distinct: async (key) => [...new Set(model.rows.map((row) => row[key]))],
    create: async (data) => {
      const createOne = (input) => {
        if (input.code && model.rows.some((row) => row.code === input.code)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
        const doc = { _id: new Types.ObjectId().toString(), createdAt: new Date(), active: true, history: [], ...(name === 'LeaveRequest' ? { status: 'pending' } : {}), ...input };
        Object.defineProperties(doc, { save: { value: async () => doc }, toObject: { value: () => copy(doc) }, deleteOne: { value: async () => { model.rows = model.rows.filter((row) => row !== doc); } } });
        model.rows.push(doc); return doc;
      };
      return Array.isArray(data) ? data.map(createOne) : createOne(data);
    },
  };
  models.set(name, model); return model;
}
export function resetModels() { for (const model of models.values()) model.rows = []; }
