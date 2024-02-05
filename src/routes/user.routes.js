import { Router } from "express";
import { loginUser, registerUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'

const router = Router()

// method 1 
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser
    );

router.route("/login").post(loginUser);

// secured routes...


export default router;



// method 2
// router.post("/register", registerUser);
