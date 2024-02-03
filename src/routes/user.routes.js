import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
const router = Router()

// method 1 
// router.route("/register").post(registerUser);

// method 2
router.post("/register", registerUser);

export default router;