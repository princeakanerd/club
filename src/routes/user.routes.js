import { Router } from "express";
const router = Router() ;


router.route("/hello").get( (req, res) => {
    res.json({
        name :"prince",
        age : 20
    }) ;
})

export default router ;