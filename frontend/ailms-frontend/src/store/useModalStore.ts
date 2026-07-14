import { create } from "zustand"

interface ModalState {
  isOpenLogin: boolean
  isOpenRegister: boolean
  isOpenForgotPassword: boolean
  isOpenVerifyOtp: boolean
  isOpenResetPassword: boolean
  isOpenChangePassword: boolean
  emailForOtp: string
  otpCode: string

  openLogin: () => void
  closeLogin: () => void
  openRegister: () => void
  closeRegister: () => void
  openForgotPassword: () => void
  closeForgotPassword: () => void
  openVerifyOtp: (email?: string) => void
  closeVerifyOtp: () => void
  openResetPassword: (email?: string, otp?: string) => void
  closeResetPassword: () => void
  openChangePassword: () => void
  closeChangePassword: () => void
  closeAll: () => void
}

export const useModalStore = create<ModalState>((set) => ({
  isOpenLogin: false,
  isOpenRegister: false,
  isOpenForgotPassword: false,
  isOpenVerifyOtp: false,
  isOpenResetPassword: false,
  isOpenChangePassword: false,
  emailForOtp: "",
  otpCode: "",

  openLogin: () => set({ isOpenLogin: true, isOpenRegister: false, isOpenForgotPassword: false, isOpenVerifyOtp: false, isOpenResetPassword: false }),
  closeLogin: () => set({ isOpenLogin: false }),
  openRegister: () => set({ isOpenRegister: true, isOpenLogin: false, isOpenForgotPassword: false, isOpenVerifyOtp: false, isOpenResetPassword: false }),
  closeRegister: () => set({ isOpenRegister: false }),
  openForgotPassword: () => set({ isOpenForgotPassword: true, isOpenLogin: false, isOpenRegister: false, isOpenVerifyOtp: false, isOpenResetPassword: false }),
  closeForgotPassword: () => set({ isOpenForgotPassword: false }),
  openVerifyOtp: (email = "") => set({ isOpenVerifyOtp: true, emailForOtp: email, isOpenLogin: false, isOpenRegister: false, isOpenForgotPassword: false, isOpenResetPassword: false }),
  closeVerifyOtp: () => set({ isOpenVerifyOtp: false }),
  openResetPassword: (email = "", otp = "") => set({ isOpenResetPassword: true, emailForOtp: email, otpCode: otp, isOpenLogin: false, isOpenRegister: false, isOpenForgotPassword: false, isOpenVerifyOtp: false }),
  closeResetPassword: () => set({ isOpenResetPassword: false }),
  openChangePassword: () => set({ isOpenChangePassword: true }),
  closeChangePassword: () => set({ isOpenChangePassword: false }),
  closeAll: () => set({
    isOpenLogin: false,
    isOpenRegister: false,
    isOpenForgotPassword: false,
    isOpenVerifyOtp: false,
    isOpenResetPassword: false,
    isOpenChangePassword: false
  })
}))
