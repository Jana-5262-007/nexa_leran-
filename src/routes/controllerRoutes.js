const express=require('express'),store=require('../userStore');const router=express.Router();
router.post('/login',(req,res)=>{const r=store.login(req.body?.regNumber,req.body?.password);if(!r||r.role!=='controller')return res.status(401).json({ok:false,message:'Invalid controller credentials.'});res.json({ok:true,user:r.user})});
router.get('/users',(req,res)=>res.json({ok:true,...store.listUsers()}));
router.post('/users',(req,res)=>{try{res.status(201).json({ok:true,user:store.createUser(req.body?.role,req.body)})}catch(e){res.status(400).json({ok:false,message:e.message})}});
router.patch('/users/:regNumber',(req,res)=>{try{res.json({ok:true,user:store.updateUser(req.params.regNumber,req.body)})}catch(e){res.status(400).json({ok:false,message:e.message})}});
router.delete('/users/:regNumber',(req,res)=>{try{store.deleteUser(req.params.regNumber);res.json({ok:true})}catch(e){res.status(404).json({ok:false,message:e.message})}});module.exports=router;
