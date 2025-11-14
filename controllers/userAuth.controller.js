import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

export const UserSignUp = async (req, res) => {
  try {
    const {name, email, password} = req.body;
    
    const exists = await User.findOne({email});
    if (exists) return res.status(400).json({error: "User already exists"});

    const hashedPassword = await bcrypt.hash(password,10);

    const user = await User.create({
        name,
        email,
        password: hashedPassword
    });

    res.status(201).json({
        message: "User registered",
        user:{
            id: user._id,
            name: user.name,
            email: user.email,

        }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
