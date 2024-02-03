import asyncHandler from 'express-async-handler'

// const registerUser = async (req, res)=>{
//     res.send("working")
// }

const registerUser = asyncHandler(async(req, res)=>{
    res.status(200).send("working")
})

export {registerUser};