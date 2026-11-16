import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/layouts/Icons";

interface UserProfile {
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  role: string;
  departmentName: string;
  duty: string;
}

const calculateDuty = (posName: string, deptName: string, roleName: string) => {
  const pos = (posName || "").toLowerCase();
  const dept = (deptName || "").toLowerCase();
  const role = (roleName || "").toLowerCase();

  if (pos.includes("giám đốc") || pos.includes("director")) {
    return "Quản lý nhân sự và chính sách toàn công ty";
  }
  if (
    pos.includes("trưởng phòng") ||
    pos.includes("leader") ||
    pos.includes("quản lý")
  ) {
    return `Quản lý, phân công và điều hành hoạt động ${deptName || "phòng ban"}`;
  }
  if (role.includes("admin")) {
    return "Quản trị hệ thống, giám sát nhân sự và phân quyền";
  }

  if (dept.includes("marketing")) return "Truyền thông và quảng bá sản phẩm";
  if (
    dept.includes("kỹ thuật") ||
    dept.includes("it") ||
    dept.includes("công nghệ")
  )
    return "Phát triển và bảo trì hệ thống phần mềm";
  if (dept.includes("kinh doanh") || dept.includes("sales"))
    return "Tìm kiếm, tư vấn khách hàng và phát triển thị trường";
  if (dept.includes("hành chính") || dept.includes("nhân sự"))
    return "Quản lý tuyển dụng, chấm công và chế độ phúc lợi";
  if (dept.includes("kế toán") || dept.includes("tài chính"))
    return "Quản lý hóa đơn thu chi, ngân sách và thuế";

  return "Thực hiện các công việc chuyên môn được phân công";
};

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const rawUser = localStorage.getItem("user");
        let currentUser = rawUser ? JSON.parse(rawUser) : {};
        const token =
          localStorage.getItem("token") || localStorage.getItem("accessToken");
        const headers: Record<string, string> = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        let dbUser = { ...currentUser };
        try {
          const empRes = await fetch("http://localhost:5000/api/employees", {
            headers,
          });
          if (empRes.ok) {
            const empData = await empRes.json();
            const list = Array.isArray(empData)
              ? empData
              : empData.data || empData.employees || [];

            const matched = list.find(
              (e: any) =>
                (currentUser.email &&
                  e.email?.toLowerCase() ===
                    currentUser.email?.toLowerCase()) ||
                (currentUser._id &&
                  (e._id === currentUser._id || e.id === currentUser._id)) ||
                (currentUser.fullName && e.fullName === currentUser.fullName),
            );

            if (matched) {
              dbUser = { ...dbUser, ...matched };
            }
          }
        } catch {}

        let deptName = dbUser.departmentName || "";
        const targetDeptId =
          dbUser.departmentId ||
          (dbUser.department && dbUser.department._id) ||
          dbUser.department;

        if (typeof targetDeptId === "object" && targetDeptId?.name) {
          deptName = targetDeptId.name;
        } else if (targetDeptId) {
          try {
            const deptRes = await fetch(
              "http://localhost:5000/api/departments",
              { headers },
            );
            if (deptRes.ok) {
              const deptData = await deptRes.json();
              const deptList = Array.isArray(deptData)
                ? deptData
                : deptData.data || deptData.departments || [];
              const foundDept = deptList.find(
                (d: any) => d._id === targetDeptId || d.id === targetDeptId,
              );
              if (foundDept) {
                deptName = foundDept.name;
              }
            }
          } catch {}
        }

        if (!deptName) {
          if (
            dbUser.role === "admin_hr" ||
            (dbUser.position || "").toLowerCase().includes("nhân sự")
          ) {
            deptName = "Phòng Hành chính Nhân sự";
          } else {
            deptName = "Chưa cập nhật phòng ban";
          }
        }

        const finalPosition =
          dbUser.position ||
          (dbUser.role === "admin_hr" ? "Admin HR" : "Nhân viên");
        const finalDuty = calculateDuty(
          finalPosition,
          deptName,
          dbUser.role || "",
        );

        setProfile({
          employeeCode: dbUser.employeeCode || "Đang tải...",
          fullName: dbUser.fullName || currentUser.fullName || "Người dùng",
          email: dbUser.email || currentUser.email || "",
          phone:
            dbUser.phone && dbUser.phone.trim() !== ""
              ? dbUser.phone
              : "Chưa cập nhật",
          position: finalPosition,
          role: dbUser.role || "employee",
          departmentName: deptName,
          duty: finalDuty,
        });
      } catch (error) {
        console.error("Lỗi tải thông tin hồ sơ:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Đang đồng bộ thông tin hồ sơ từ cơ sở dữ liệu...
      </div>
    );
  }

  return (
    <div
      className="profile-page-wrap"
      style={{ padding: "24px 32px", maxWidth: "1200px", margin: "0 auto" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13.5px",
          color: "#64748b",
          marginBottom: "20px",
        }}
      >
        <Link
          to="/dashboard"
          style={{
            textDecoration: "none",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Icon name="home" size={16} /> Trang chủ
        </Link>
        <span>/</span>
        <span style={{ color: "#0f172a", fontWeight: "600" }}>
          Hồ sơ cá nhân
        </span>
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "28px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
            }}
          >
            {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : "U"}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: "22px",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                {profile?.fullName}
              </h1>
              <span
                style={{
                  backgroundColor: "#dcfce7",
                  color: "#16a34a",
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "#16a34a",
                  }}
                />
                Đang làm việc
              </span>
            </div>
            <p
              style={{ margin: "6px 0 0", fontSize: "14px", color: "#64748b" }}
            >
              {profile?.position} • Mã NV:{" "}
              <b style={{ color: "#2563eb" }}>{profile?.employeeCode}</b>
            </p>
          </div>
        </div>

        <div>
          <span
            style={{
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              border: "1px solid #bfdbfe",
              fontSize: "13px",
              fontWeight: "600",
              padding: "6px 14px",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Icon name="users" size={16} />
            Vai trò:{" "}
            {profile?.role === "admin_hr"
              ? "Quản trị viên (Admin HR)"
              : "Nhân viên (Employee)"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingBottom: "14px",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="building" size={20} />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "700",
                color: "#0f172a",
              }}
            >
              Thông tin công tác & Vị trí
            </h3>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Mã nhân viên (Employee Code)
              </span>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#0f172a",
                  marginTop: "2px",
                }}
              >
                {profile?.employeeCode}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Phòng ban trực thuộc
              </span>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#2563eb",
                  marginTop: "2px",
                }}
              >
                {profile?.departmentName}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Chức vụ
              </span>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#0f172a",
                  marginTop: "2px",
                }}
              >
                {profile?.position}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Nhiệm vụ
              </span>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1e293b",
                  backgroundColor: "#f8fafc",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginTop: "4px",
                  lineHeight: "1.4",
                }}
              >
                {profile?.duty}
              </div>
            </div>
          </div>
        </div>

        {/* Khối 2: Thông tin liên hệ */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              paddingBottom: "14px",
              borderBottom: "1px solid #f1f5f9",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="users" size={20} />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "700",
                color: "#0f172a",
              }}
            >
              Thông tin liên hệ & Trạng thái
            </h3>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Địa chỉ Email
              </span>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#0f172a",
                  marginTop: "2px",
                }}
              >
                {profile?.email}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Số điện thoại
              </span>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#0f172a",
                  marginTop: "2px",
                }}
              >
                {profile?.phone}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                Trạng thái tài khoản
              </span>
              <div
                style={{
                  fontSize: "14.5px",
                  fontWeight: "600",
                  color: "#16a34a",
                  marginTop: "2px",
                }}
              >
                Đang kích hoạt (Active)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
