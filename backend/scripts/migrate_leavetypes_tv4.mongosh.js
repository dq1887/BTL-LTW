(() => {
  const APPLY = false;
  const d = db.getSiblingDB("EmployeeManagement");
  const types = d.getCollection("leavetypes");
  const requests = d.getCollection("leaverequests");
  const desired = [
    {
      code: "paid",
      name: "Nghỉ có lương",
      isPaid: true,
      isActive: true,
      description: "Nghỉ có lương tối đa 12 ngày trong mỗi năm dương lịch",
    },
    {
      code: "unpaid",
      name: "Nghỉ không lương",
      isPaid: false,
      isActive: true,
      description: "Nghỉ không lương, không trừ hạn mức 12 ngày",
    },
  ];
  print("===== KIEM KE TRUOC KHI SUA =====");
  print("Tong leavetypes: " + types.countDocuments({}));
  print("Tong leaverequests: " + requests.countDocuments({}));
  types
    .find({}, { _id: 1, code: 1, name: 1, isPaid: 1, isActive: 1 })
    .forEach((x) => print(JSON.stringify(x)));
  const legacy = types
    .find(
      { code: { $nin: ["paid", "unpaid"] } },
      { _id: 1, code: 1, name: 1, isPaid: 1, isActive: 1 },
    )
    .toArray();
  print("So loai cu de chuyen sang inactive: " + legacy.length);
  const existingOldRequests = requests.countDocuments({
    leaveTypeId: { $in: legacy.map((x) => x._id) },
  });
  print(
    "So don dang tham chieu loai cu (SE DUOC GIU NGUYEN): " +
      existingOldRequests,
  );

  const pendingOldPaid = requests
    .find(
      { status: "approved", totalDays: null },
      { _id: 1, employeeId: 1, startDate: 1, endDate: 1, leaveTypeId: 1 },
    )
    .toArray();
  print(
    "Don approved totalDays=null CAN KIEM TRA LICH: " + pendingOldPaid.length,
  );
  pendingOldPaid.forEach((x) => print(JSON.stringify(x)));

  if (!APPLY) {
    print(
      "DRY RUN: CHUA SUA DATABASE. Export backup roi doi APPLY=true de thuc hien.",
    );
    return;
  }

  desired.forEach((item) => {
    const result = types.updateOne(
      { code: item.code },
      { $set: item },
      { upsert: true },
    );
    print("UPSERT " + item.code + ": " + JSON.stringify(result));
  });
  const result = types.updateMany(
    { code: { $nin: ["paid", "unpaid"] } },
    { $set: { isActive: false } },
  );
  print("Vo hieu hoa loai cu (khong xoa): " + JSON.stringify(result));
  print("===== SAU KHI SUA =====");
  types
    .find({ isActive: true }, { _id: 1, code: 1, isPaid: 1, name: 1 })
    .forEach((x) => print(JSON.stringify(x)));
  print(
    "Tong don sau khi sua (phai bang truoc): " + requests.countDocuments({}),
  );
  print(
    "HOAN THANH - Don lich su van giu ID loai cu, backend van tinh la paid neu isPaid=true.",
  );
})();
