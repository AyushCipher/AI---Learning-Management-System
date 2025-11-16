import { genToken } from "../configs/token.js"
import validator from "validator"
import bcrypt from "bcryptjs"
import User from "../models/userModel.js"
import sendMail from "../configs/Mail.js"

// ================= SIGN UP =====================
export const signUp = async (req, res) => {
    try {
        let { name, email, password, role } = req.body

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let existUser = await User.findOne({ email })
        if (existUser) {
            return res.status(400).json({ message: "Email already exists!" })
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Please enter a valid email!" })
        }

        if (password.length < 8) {
            return res.status(400).json({ message: "Please enter a Strong Password!" })
        }

        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one uppercase letter" })
        }

        if (!/[0-9]/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one number" })
        }

        if (!/[@$!%*?&]/.test(password)) {
            return res.status(400).json({ message: "Password must contain at least one special character" })
        }

        let hashPassword = await bcrypt.hash(password, 10)

        let user = await User.create({
            name,
            email,
            password: hashPassword,
            role,
        })

        let token = await genToken(user._id)

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        return res.status(201).json(user)

    } catch (error) {
        console.log("signUp error", error)
        return res.status(500).json({ message: `SignUp Error: ${error}` })
    }
}

// ================= LOGIN =====================
export const login = async (req, res) => {
    try {
        let { email, password } = req.body
        let user = await User.findOne({ email })

        if (!user) {
            return res.status(400).json({ message: "User does not exist!" })
        }

        let isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect Password" })
        }

        let token = await genToken(user._id)

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        return res.status(200).json(user)

    } catch (error) {
        console.log("Login error", error)
        return res.status(500).json({ message: `Login Error: ${error}` })
    }
}

// ================= LOGOUT =====================
export const logOut = async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "None",
        })
        return res.status(200).json({ message: "Logged Out Successfully" })
    } catch (error) {
        return res.status(500).json({ message: `Logout Error: ${error}` })
    }
}

// ================= GOOGLE SIGNUP =====================
export const googleSignup = async (req, res) => {
    try {
        const { name, email, role } = req.body

        let user = await User.findOne({ email })

        if (!user) {
            user = await User.create({
                name,
                email,
                role
            })
        }

        let token = await genToken(user._id)

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        return res.status(200).json(user)

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: `Google Signup Error: ${error}` })
    }
}

// ================= SEND OTP =====================
export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString()

        user.resetOtp = otp
        user.otpExpires = Date.now() + 5 * 60 * 1000
        user.isOtpVerifed = false

        await user.save()
        await sendMail(email, otp)

        return res.status(200).json({ message: "Email Sent Successfully!" })

    } catch (error) {
        return res.status(500).json({ message: `Send OTP Error: ${error}` })
    }
}

// ================= VERIFY OTP =====================
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body
        const user = await User.findOne({ email })

        if (!user || user.resetOtp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid OTP!" })
        }

        user.isOtpVerifed = true
        user.resetOtp = undefined
        user.otpExpires = undefined

        await user.save()
        return res.status(200).json({ message: "OTP verified!" })

    } catch (error) {
        return res.status(500).json({ message: `Verify OTP Error: ${error}` })
    }
}

// ================= RESET PASSWORD =====================
export const resetPassword = async (req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email })

        if (!user || !user.isOtpVerifed) {
            return res.status(404).json({ message: "OTP verification required" })
        }

        const isSamePassword = await bcrypt.compare(password, user.password)
        if (isSamePassword) {
            return res.status(400).json({ message: "New password cannot be same as old password" })
        }

        const hashPassword = await bcrypt.hash(password, 10)
        user.password = hashPassword
        user.isOtpVerifed = false

        await user.save()
        return res.status(200).json({ message: "Password Reset Successfully" })

    } catch (error) {
        return res.status(500).json({ message: `Reset Password Error: ${error}` })
    }
}
