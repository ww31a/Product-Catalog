import { Router } from "express";
const authrouter = Router();

authrouter.post('/login')
authrouter.post('/logout')

export default authrouter;