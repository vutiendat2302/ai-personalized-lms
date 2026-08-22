import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { studentApi } from "@/api/students/studentApi";
import { studentApi as studentPortalApi } from "@/api/student/studentApi";
import { userApi } from "@/api/users/userApi";
import { interestApi, type InterestResponse } from "@/api/interests/interestApi";
import type {
  CreateStudentProfileRequest,
  CreateGuardianRequest,
  GuardianRelationship,
  CreateStudyGoalRequest,
  StudyGoalTypeEnum,
} from "@/api/students/studentApi";
import {
  Sparkles,
  GraduationCap,
  Target,
  Heart,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Calendar,
  Flame,
  Clock,
  Award,
  BookMarked,
  ShieldAlert,
  AlertCircle,
} from "lucide-react";

interface StudentOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialStep?: number;
}

export const StudentOnboardingModal: React.FC<StudentOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialStep,
}) => {
  const { auth } = useAuth();
  const userId = auth.user?.id != null ? String(auth.user.id) : undefined;

  // Onboarding steps: 1: Profile, 2: Guardian (if < 18), 3: Goal, 4: Interests
  const [step, setStep] = useState(1);

  // Calculate age based on user dateOfBirth or state
  const [dob, setDob] = useState<string>("");
  const [isUnder18, setIsUnder18] = useState<boolean>(false);

  // Step 1: Profile State
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [customEducationLevel, setCustomEducationLevel] = useState<string>("");
  const [goal, setGoal] = useState<string>("");
  const [customGoal, setCustomGoal] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [schoolName, setSchoolName] = useState<string>("");

  // Step 2: Guardian State
  const [guardianFullName, setGuardianFullName] = useState<string>("");
  const [guardianRelationship, setGuardianRelationship] =
    useState<GuardianRelationship>("FATHER");
  const [guardianPhone, setGuardianPhone] = useState<string>("");
  const [guardianEmail, setGuardianEmail] = useState<string>("");
  const [guardianAddress, setGuardianAddress] = useState<string>("");

  // Step 3: Goal State
  const [studyGoalType, setStudyGoalType] =
    useState<StudyGoalTypeEnum>("DAILY_STREAK");
  const [targetValue, setTargetValue] = useState<number>(7);

  // Step 4: Interests State
  const [interests, setInterests] = useState<InterestResponse[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(false);
  const [interestsError, setInterestsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Preset options for quick selection
  const EDUCATION_OPTIONS = [
    "Học sinh THCS / THPT",
    "Sinh viên Đại học / Cao đẳng",
    "Đã đi làm / Chuyên viên",
    "Bằng Cử nhân (Bachelor)",
    "Bằng Thạc sĩ / Tiến sĩ",
  ];

  const GOAL_OPTIONS = [
    "Chuyển việc & Phát triển sự nghiệp mới",
    "Nâng cao kỹ năng làm việc thực tế",
    "Hỗ trợ môn học & Đồ án trên trường",
    "Khám phá kiến thức & Thỏa mãn đam mê",
  ];

  const DESCRIPTION_OPTIONS = [
    "Tôi bắt đầu học từ con số 0",
    "Tôi đã có nền tảng cơ bản",
    "Tôi muốn lấy chứng chỉ bổ sung CV",
  ];

  const STUDY_GOAL_TYPES: {
    type: StudyGoalTypeEnum;
    title: string;
    description: string;
    icon: any;
    defaultTarget: number;
    unit: string;
    targets: number[];
  }[] = [
    {
      type: "DAILY_STREAK",
      title: "Học liên tiếp (Daily Streak)",
      description: "Duy trì thói quen học tập đều đặn hàng ngày",
      icon: Flame,
      defaultTarget: 7,
      unit: "ngày",
      targets: [3, 7, 14, 30],
    },
    {
      type: "WEEKLY_STUDY_DAYS",
      title: "Số ngày học mỗi tuần",
      description: "Đạt số ngày học mong muốn trong một tuần",
      icon: Calendar,
      defaultTarget: 5,
      unit: "ngày/tuần",
      targets: [3, 4, 5, 7],
    },
    {
      type: "COURSE_COMPLETION",
      title: "Hoàn thành khóa học",
      description: "Mục tiêu số khóa học hoàn tất",
      icon: Award,
      defaultTarget: 1,
      unit: "khóa",
      targets: [1, 2, 3, 5],
    },
    {
      type: "LESSON_COMPLETION",
      title: "Hoàn thành bài học",
      description: "Số lượng bài học hoàn thành",
      icon: BookMarked,
      defaultTarget: 20,
      unit: "bài",
      targets: [10, 20, 35, 50],
    },
    {
      type: "STUDY_HOURS",
      title: "Số giờ tự học",
      description: "Tổng thời gian tích lũy học tập",
      icon: Clock,
      defaultTarget: 10,
      unit: "giờ",
      targets: [5, 10, 20, 50],
    },
  ];

  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Load fixed interests for Step 4 & User Profile for dateOfBirth under 18 check
  useEffect(() => {
    if (!isOpen) return;

    // Always start at step 1 or initialStep if passed
    const startStep = initialStep ? initialStep : 1;
    setStep(startStep);

    /** Tải dữ liệu onboarding và chỉ giữ các sở thích đang hoạt động từ backend. */
    const initModalData = async () => {
      setInterestsLoading(true);
      setInterestsError(null);
      try {
        const res = await interestApi.getInterests();
        const activeInterests = Array.isArray(res.data?.data)
          ? res.data.data.filter((item) => item.status == null || item.status === 1)
          : [];
        setInterests(activeInterests);
        if (activeInterests.length === 0) {
          setInterestsError("Hệ thống chưa cấu hình sở thích để lựa chọn.");
        }
      } catch (err) {
        console.error("Error fetching interests for onboarding:", err);
        setInterests([]);
        setInterestsError("Không thể tải danh sách sở thích từ hệ thống.");
      } finally {
        setInterestsLoading(false);
      }

      // Pre-fill personalization data if already created (for Update flow)
      try {
        const personalization = await studentPortalApi.getPersonalization();
        if (personalization) {
          if (personalization.educationLevel) {
            setEducationLevel(personalization.educationLevel);
          }
          if (personalization.goal) {
            setGoal(personalization.goal);
          }
          if (personalization.description) {
            setDescription(personalization.description);
          }
          if (personalization.schoolName) {
            setSchoolName(personalization.schoolName);
          }
          if (personalization.interests && Array.isArray(personalization.interests)) {
            const ids = personalization.interests.map((i: any) => String(i.id));
            if (ids.length > 0) setSelectedInterestIds(ids);
          }
          if (personalization.studyGoals && personalization.studyGoals.length > 0) {
            const firstGoal = personalization.studyGoals[0];
            if (firstGoal.studyGoalTypeEnum) setStudyGoalType(firstGoal.studyGoalTypeEnum as StudyGoalTypeEnum);
            if (firstGoal.targetValue) setTargetValue(firstGoal.targetValue);
          }
        }
      } catch (pErr) {
        console.warn("Could not fetch existing personalization data for prefill:", pErr);
      }

      try {
        const profRes = await userApi.getProfile();
        if (profRes.data?.success && profRes.data?.data?.dateOfBirth) {
          const userDob = profRes.data.data.dateOfBirth;
          setDob(userDob);
          setIsUnder18(calculateIsUnder18(userDob));
        }
      } catch (pErr) {
        console.warn("Using default date of birth for student onboarding:", pErr);
      }
    };
    initModalData();
  }, [isOpen, initialStep, userId]);

  // Calculate age under 18 check
  const calculateIsUnder18 = (dateString?: string) => {
    if (!dateString) return false;
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age < 18;
  };

  const handleNextStep1 = async () => {
    const finalEdu = customEducationLevel.trim() || educationLevel;
    const finalGoal = customGoal.trim() || goal;
    const finalDesc = customDescription.trim() || description;

    if (!finalEdu && !finalGoal && !finalDesc) {
      setStep1Error("Vui lòng chọn hoặc nhập thông tin trình độ / mục tiêu của bạn trước khi bấm Tiếp tục.");
      return;
    }

    setStep1Error(null);

    // Create / Update Student Profile in Step 1 and get isMinor calculated by Backend
    let backendIsMinor = false;

    if (userId) {
      try {
        // 1. Update user Date of Birth if entered/changed
        if (dob) {
          try {
            await userApi.updateProfile({ dateOfBirth: dob } as any);
          } catch (uErr) {
            console.warn("Date of birth update note:", uErr);
          }
        }

        // 2. Call Backend createProfile
        const profRes = await studentApi.createProfile({
          userId,
          educationLevel: finalEdu,
          goal: finalGoal,
          description: finalDesc,
          schoolName: schoolName.trim(),
        });

        // 3. Read isMinor calculated by Backend
        if (profRes.data?.data && typeof profRes.data.data.isMinor === "boolean") {
          backendIsMinor = profRes.data.data.isMinor;
        } else {
          backendIsMinor = calculateIsUnder18(dob);
        }
      } catch (e) {
        console.warn("Profile API note in Step 1:", e);
        backendIsMinor = calculateIsUnder18(dob);
      }
    } else {
      backendIsMinor = calculateIsUnder18(dob);
    }

    setIsUnder18(backendIsMinor);

    // 4. Decide next step based on backendIsMinor
    if (backendIsMinor) {
      setStep(2); // Guardian Step for under 18
    } else {
      setStep(3); // Study Goal Step directly
    }
  };

  const handleSkipGuardian = () => {
    setStep(3);
  };

  const handleNextGuardian = () => {
    setStep(3);
  };

  const handleNextGoal = () => {
    setStep(4);
  };

  /** Chọn hoặc bỏ chọn một sở thích có thật từ backend. */
  const handleToggleInterest = (id: string) => {
    setSelectedInterestIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  /** Lưu onboarding và chỉ hoàn tất khi các sở thích đã chọn được backend ghi nhận. */
  const handleFinishOnboarding = async (skip: boolean = false) => {
    if (!userId) {
      onClose();
      return;
    }
    if (!skip && selectedInterestIds.length === 0) {
      setSubmitError("Vui lòng chọn ít nhất một sở thích từ danh sách.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError(null);
      if (!skip) {
        // 1. Submit Profile
        const finalEdu = customEducationLevel.trim() || educationLevel;
        const finalGoal = customGoal.trim() || goal;
        const finalDesc = customDescription.trim() || description;

        const profilePayload: CreateStudentProfileRequest = {
          userId,
          educationLevel: finalEdu,
          goal: finalGoal,
          description: finalDesc,
          schoolName: schoolName.trim(),
        };

        try {
          await studentApi.createProfile(profilePayload);
        } catch (e) {
          console.log("Profile API note:", e);
        }

        // 2. Submit Guardian if filled & under 18
        if (isUnder18 && guardianFullName.trim()) {
          const guardianPayload: CreateGuardianRequest = {
            studentUserId: userId,
            fullName: guardianFullName.trim(),
            relationship: guardianRelationship,
            phone: guardianPhone.trim(),
            email: guardianEmail.trim(),
            address: guardianAddress.trim(),
          };
          try {
            await studentApi.createGuardian(guardianPayload);
          } catch (e) {
            console.log("Guardian API note:", e);
          }
        }

        // 3. Create or update the single general Study Goal
        const goalPayload: Pick<CreateStudyGoalRequest, "studyGoalTypeEnum" | "targetValue"> = {
          studyGoalTypeEnum: studyGoalType,
          targetValue,
        };
        try {
          const existingGoals = await studentPortalApi.getGoals();
          const existingGoal = existingGoals.find((item) => item.courseId == null);
          if (existingGoal) {
            await studentPortalApi.updateGoal(existingGoal.id, goalPayload);
          } else {
            await studentPortalApi.createGoal(goalPayload);
          }
        } catch (e) {
          console.log("Goal API note:", e);
        }

        // 4. Assign Interests if selected
        if (selectedInterestIds.length > 0) {
          await studentApi.assignInterests({ interestIds: selectedInterestIds });
        }
      }

      // 5. Explicitly update hasGoal = true in Backend Database
      try {
        await studentApi.updateHasGoal(userId, true);
      } catch (hErr) {
        console.warn("Update hasGoal note:", hErr);
      }

      // Mark hasGoal = true in localStorage
      localStorage.setItem(`hasGoal_${userId}`, "true");

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setStep(4);
      setSubmitError("Không thể lưu sở thích. Vui lòng thử lại để hệ thống cá nhân hóa khóa học chính xác.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isEditGoalsOnly = (initialStep === 3) || (step >= 3 && localStorage.getItem(`hasGoal_${userId}`) === "true");
  const totalSteps = isEditGoalsOnly ? 2 : isUnder18 ? 4 : 3;
  const currentDisplayStep = isEditGoalsOnly
    ? (step === 3 ? 1 : 2)
    : (step === 1 ? 1 : step === 2 ? 2 : isUnder18 ? step : step - 1);
  const progressPercent = Math.round((currentDisplayStep / totalSteps) * 100);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-4xl rounded-3xl border border-border/80 shadow-2xl shadow-black/50 overflow-hidden flex flex-col max-h-[88vh] my-auto relative z-101">
        {/* Header & Coursera Progress Bar */}
        <div className="p-6 border-b border-border bg-linear-to-r from-primary/5 via-indigo-500/5 to-transparent relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  {isEditGoalsOnly ? "Cập Nhật Mục Tiêu & Sở Thích" : "Cá Nhân Hóa Lộ Trình Học Tập"}
                </span>
                <h2 className="text-sm font-bold text-foreground">
                  Bước {currentDisplayStep} trên {totalSteps}
                </h2>
              </div>
            </div>

            <button
              onClick={() => handleFinishOnboarding(true)}
              className="px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <span>{isEditGoalsOnly ? "Đóng" : "Bỏ qua"}</span>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Modal Body / Steps Scroll Container */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
          {/* STEP 1: STUDENT PROFILE */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  <span>Thiết lập hồ sơ cá nhân học viên</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Giúp hệ thống AILMS thấu hiểu định hướng và đưa ra các bài học gợi ý phù hợp nhất.
                </p>
              </div>

              {/* Validation alert if user tries to continue without selecting/typing anything */}
              {step1Error && (
                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{step1Error}</span>
                </div>
              )}

              {/* Education Level Options */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground block">
                  1. Trình độ học vấn hiện tại của bạn?
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {EDUCATION_OPTIONS.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setEducationLevel(opt);
                        setCustomEducationLevel("");
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        educationLevel === opt && !customEducationLevel
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border/70 bg-card hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Input
                  type="text"
                  placeholder="Hoặc nhập chi tiết trình độ của bạn..."
                  value={customEducationLevel}
                  onChange={(e) => setCustomEducationLevel(e.target.value)}
                  className="rounded-xl text-xs mt-2"
                />
              </div>

              {/* Goal Options */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground block">
                  2. Mục tiêu chính khi bạn đến với AILMS?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GOAL_OPTIONS.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setGoal(opt);
                        setCustomGoal("");
                      }}
                      className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        goal === opt && !customGoal
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border/70 bg-card hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Input
                  type="text"
                  placeholder="Hoặc tự nhập mục tiêu mong muốn khác..."
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  className="rounded-xl text-xs mt-2"
                />
              </div>

              {/* Description Options */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground block">
                  3. Nền tảng hiện tại của bạn trong lĩnh vực này?
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {DESCRIPTION_OPTIONS.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setDescription(opt);
                        setCustomDescription("");
                      }}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        description === opt && !customDescription
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                          : "border-border/70 bg-card hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <Input
                  type="text"
                  placeholder="Hoặc mô tả ngắn gọn định hướng học tập của bạn..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="rounded-xl text-xs mt-2"
                />
              </div>

              {/* School Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground block">
                  4. Tên Trường học / Tổ chức đang công tác:
                </label>
                <Input
                  type="text"
                  placeholder="Ví dụ: ĐH Khoa học Tự nhiên, THPT Chuyên..."
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
          )}

          {/* STEP 2: GUARDIAN PROFILE (IF UNDER 18) */}

          {step === 2 && isUnder18 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-extrabold">
                  <ShieldAlert className="h-4 w-4" /> Dành cho học sinh dưới 18 tuổi
                </div>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                  Thông tin Phụ huynh / Người giám hộ
                </h3>
                <p className="text-sm text-muted-foreground">
                  Hỗ trợ kết nối phụ huynh theo dõi tiến độ học tập và thông báo kết quả định kỳ. (Bạn có thể bỏ qua bước này).
                </p>
              </div>

              <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Họ và tên Phụ huynh:</label>
                    <Input
                      type="text"
                      placeholder="Nguyễn Văn A"
                      value={guardianFullName}
                      onChange={(e) => setGuardianFullName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Mối quan hệ:</label>
                    <select
                      value={guardianRelationship}
                      onChange={(e) =>
                        setGuardianRelationship(e.target.value as GuardianRelationship)
                      }
                      className="w-full h-10 px-3 bg-card border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:border-primary"
                    >
                      <option value="FATHER">Cha / Bố (Father)</option>
                      <option value="MOTHER">Mẹ (Mother)</option>
                      <option value="GUARDIAN">Người giám hộ hợp pháp</option>
                      <option value="OTHER">Mối quan hệ khác</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Số điện thoại liên hệ:</label>
                    <Input
                      type="text"
                      placeholder="0912345678"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Email Phụ huynh:</label>
                    <Input
                      type="email"
                      placeholder="phuhuynh@gmail.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Địa chỉ thường trú:</label>
                  <Input
                    type="text"
                    placeholder="Quận/Huyện, Tỉnh/Thành phố..."
                    value={guardianAddress}
                    onChange={(e) => setGuardianAddress(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: STUDY GOAL */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  <span>Thiết lập Mục tiêu học tập</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Hệ thống AI sẽ tự động tính toán Chuỗi học (Streak) và nhắc nhở động lực để bạn duy trì phong độ.
                </p>
              </div>

              {/* Goal Types Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STUDY_GOAL_TYPES.map((g, idx) => {
                  const Icon = g.icon;
                  const isSelected = studyGoalType === g.type;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setStudyGoalType(g.type);
                        setTargetValue(g.defaultTarget);
                      }}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                          : "border-border/70 bg-card hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{g.title}</h4>
                          <span className="text-[11px] text-muted-foreground leading-tight block">
                            {g.description}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Target Value Picker */}
              <div className="space-y-3 bg-muted/20 p-5 rounded-2xl border border-border">
                <label className="text-sm font-bold text-foreground block">
                  Chọn chỉ số chỉ tiêu học tập mong muốn:
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {STUDY_GOAL_TYPES.find((g) => g.type === studyGoalType)?.targets.map(
                    (val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTargetValue(val)}
                        className={`px-5 py-2.5 rounded-xl border text-sm font-extrabold transition-all ${
                          targetValue === val
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                            : "border-border/80 bg-card text-foreground hover:border-primary/50"
                        }`}
                      >
                        {val}{" "}
                        {
                          STUDY_GOAL_TYPES.find((g) => g.type === studyGoalType)
                            ?.unit
                        }
                      </button>
                    )
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-muted-foreground font-bold">Số khác:</span>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={targetValue}
                      onChange={(e) => setTargetValue(Number(e.target.value))}
                      className="w-20 rounded-xl text-center font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: INTERESTS */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <Heart className="h-6 w-6 text-primary" />
                  <span>Chọn chủ đề & Sở thích bạn quan tâm</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Chọn ít nhất 1 chủ đề để nhận danh sách đề xuất lộ trình chuẩn xác nhất.
                </p>
              </div>

              {interestsLoading ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Đang tải danh sách sở thích...
                </div>
              ) : interestsError ? (
                <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{interestsError}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {interests.map((item) => {
                    const isChecked = selectedInterestIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleInterest(item.id)}
                        className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isChecked
                            ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-primary font-bold"
                            : "border-border/70 bg-card hover:border-primary/50 text-foreground"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-bold line-clamp-1">{item.name}</span>
                          {item.categoryName && (
                            <span className="text-[10px] text-muted-foreground block font-medium line-clamp-1">
                              {item.categoryName}
                            </span>
                          )}
                        </div>
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? "bg-primary border-primary text-white"
                              : "border-muted-foreground/30 bg-muted/40"
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {submitError && (
                <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation Actions */}
        <div className="p-6 border-t border-border bg-card flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isEditGoalsOnly && step === 3) {
                  onClose();
                } else if (step === 3 && !isUnder18) {
                  setStep(1);
                } else {
                  setStep((prev) => prev - 1);
                }
              }}
              className="rounded-xl font-semibold gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" /> {isEditGoalsOnly && step === 3 ? "Đóng" : "Quay lại"}
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {step === 2 && isUnder18 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkipGuardian}
                className="rounded-xl font-semibold text-muted-foreground"
              >
                Bỏ qua bước Phụ huynh
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="button"
                onClick={() => {
                  if (step === 1) handleNextStep1();
                  else if (step === 2) handleNextGuardian();
                  else if (step === 3) handleNextGoal();
                }}
                className="rounded-xl font-bold px-6 gap-1.5"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleFinishOnboarding(false)}
                disabled={submitting || interestsLoading || Boolean(interestsError) || selectedInterestIds.length === 0}
                className="rounded-xl font-extrabold px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              >
                {submitting ? "Đang lưu..." : isEditGoalsOnly ? "Cập nhật Mục tiêu & Sở thích" : "Hoàn tất & Khám phá Dashboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
