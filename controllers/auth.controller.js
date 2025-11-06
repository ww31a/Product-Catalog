import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import Admin from '../models/admin.module.js'

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body

    const admin = await Admin.findOne({ email })
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' })
    }
    const isMatch = await bcrypt.compare(password, admin.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role:"admin" },process.env.JWT_SECRET,{ expiresIn: '1d' }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 
    })

    res.status(200).json({ message: 'Login successful', token })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}





export const adminLogout = async (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    res.status(200).json({ message: 'Logout successful' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
