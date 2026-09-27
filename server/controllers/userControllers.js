
import User from "../models/User.js";
import fs from "fs";
import imagekit from "../configs/imagekit.js";
import Connection from "../models/Connection.js";
import Post from "../models/Post.js";
import { inngest } from "../inngest/index.js";

export const getUserData = async (req, res) => {
     try {
        const {userId} =  req.auth();
         const user = await User.findById(userId)
         if(!user){
            return res.json({success:false , message:"User not found"});
         }
            res.json({success:true ,user});   
     } catch (error) {
         console.log(error);
            res.json({success:false , message:error.message});
         
     }
}

// update user data
export const updateUserData = async (req, res) => {
     try {
        const {userId} =  req.auth();
         let {username , bio , location , full_name } = req.body;
          const tempUser = await User.findById(userId);
           !username && (username = tempUser.username);
             if(tempUser.username !== username){
                 const user = await User.findOne({username});
                  if(user){
                     username = tempUser.username; // usename will not chage if already taken
                  }
             }
              const updatedData = {
                username,
                bio,
                location,
                full_name
              }    
          const profile = req.files.profile && req.files.profile[0];
          const cover = req.files.cover && req.files.cover[0];
            if(profile){
                const buffer = fs.readFileSync(profile.path);
                const response = await imagekit.upload({
                    file: buffer,
                    fileName: profile.originalname,
                })
                 const url = imagekit.url({
                     path: response.filePath,
                     transformation: [
                         {quality : 'auto'},
                         {format : 'webp'},
                         {width : '512'}
                     ]
                 });
                    updatedData.profile_picture = url;
            }
            if(cover){
                const buffer = fs.readFileSync(cover.path);
                const response = await imagekit.upload({
                    file: buffer,
                    fileName: cover.originalname,
                })
                 const url = imagekit.url({
                     path: response.filePath,
                     transformation: [
                         {quality : 'auto'},
                         {format : 'webp'},
                         {width : '1280'}
                     ]
                 });
                    updatedData.cover_photo = url;
            }
             const user = await User.findByIdAndUpdate(userId, updatedData , {new:true});
            res.json({success:true , user , message:"Profile updated successfully"});
     } catch (error) {
         console.log(error);
            res.json({success:false , message:error.message});
         
     }
}

/**
 * 💡 [Hinglish Explanation]:
 * Search / Discover endpoint jo username, full name, location ya email se matching users find karta hai.
 * [Bug Fix #4]: Pehle yahan const {useId} = req.auth() likha tha (typo). useId undefined tha,
 * isliye filter(user => user._id !== useId) fail hota tha aur search me khud ka user profile bhi show hota tha.
 * Saath hi pehle User.find() se saare users memory me load ho rahe the.
 * Ab database level par hi {_id: { $ne: userId }} filter aur .limit(25) lagaya hai jo production-fast hai.
 */
export const discoverUsers = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { input } = req.body;

    const query = {
      _id: { $ne: userId } // Current user ko discover suggestions se exclude karo
    };

    if (input && input.trim()) {
      const regex = new RegExp(input.trim(), 'i');
      query.$or = [
        { username: regex },
        { email: regex },
        { full_name: regex },
        { location: regex }
      ];
    }

    const filteredUsers = await User.find(query).limit(30).select('-__v');
    res.json({ success: true, users: filteredUsers });
  } catch (error) {
    console.error("DiscoverUsers Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 💡 [Hinglish Explanation]:
 * User ko follow karne ka controller:
 * 1. Current user ke 'following' array me target user (id) add karo.
 * 2. Target user ke 'followers' array me current user (userId) add karo.
 * $addToSet use kiya hai taaki duplicate entries na ho sakein.
 */
export const followUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    if (userId === id) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.following.includes(id)) {
      return res.json({ success: false, message: "You are already following this user" });
    }

    // Atomic updates for both users to prevent race conditions
    await User.findByIdAndUpdate(userId, { $addToSet: { following: id } });
    await User.findByIdAndUpdate(id, { $addToSet: { followers: userId } });

    res.json({ success: true, message: "Now you are following this user" });
  } catch (error) {
    console.error("FollowUser Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 
 * User ko unfollow karne ka controller:
 * [Bug Fix #3]: Pehle yahan 'const toUser = await User.findById(userId)' likha tha (galti se target id ki jagah userId).
 * Isse current user ka hi follower array modify ho raha tha aur target user ke followers se kuch delete nahi ho raha tha.
 * Ab atomic $pull ke through:
 * 1. Current user (userId) ke 'following' list se target 'id' ko remove kiya hai.
 * 2. Target user ('id') ke 'followers' list se current 'userId' ko remove kiya hai.
 */
export const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Target user ID is required" });
    }

    // 1. Current user ki following list se target id hatao
    await User.findByIdAndUpdate(userId, { $pull: { following: id } });

    // 2. Target user ki followers list se current userId hatao (Bug Fix: pehle yahan userId se find ho raha tha)
    await User.findByIdAndUpdate(id, { $pull: { followers: userId } });

    res.json({ success: true, message: "You are no longer following this user" });
  } catch (error) {
    console.error("UnfollowUser Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
//   send connection request
   export const sendConnectionRequest = async (req, res) => {
       try {
          const {userId} = req.auth(); // splling pe dhayan do beta 
          const {id} = req.body;
          // chek if user has sent more than 20 req in 24 hours
           const last24Hours = new Date(Date.now() - 24*60*60*1000);
           const connectionRequests = await Connection.find({from_user_id:userId , createdAt:{$gte:last24Hours}});
            if(connectionRequests.length >= 20){
               return res.json({success:false , message:"You have reached the limit of 20 connection requests in 24 hours"});
            }
             // chek if user already conncectdd
             const connection = await Connection.findOne({
                $or:[
                   {from_user_id:userId , to_user_id:id},
                   {from_user_id:id , to_user_id:userId}
                ]
             })
              if(!connection){
              const newConnection =   await Connection.create({
                     from_user_id:userId,
                     to_user_id:id
                })
                 await  inngest.send({
                     name: 'app/connection-request',
                     data: {connectionId: newConnection._id}
                 })
                  return res.json({success:true , message:"Connection request sent successfully"});
              } else if(connection && connection.status === 'accepted'){
                  return res.json({success:false , message:"You are already connected with this user"});
                 
              }
               return res.json({success:false , message:"Connection request Pending"});
         
       } catch (error) {
            console.log(error);
            res.json({success:false , message:error.message});
       }
   }

   //  get user connections
   export const getUserConnections = async (req, res) => {
       try {
            const {userId} = req.auth();
            const user = await User.findById(userId).populate('connections followers following'); // yaha last me space tha ek wo ek ghata kharab kiya na monogo me space populate nahi haota hai last me dhayn de beta soch smajh 
             const connections = user.connections;
              const followers = user.followers;
               const following = user.following;
               const pendingConnections = (await Connection.find({to_user_id:userId , status:'pending'}).populate('from_user_id')).map(connection => connection.from_user_id);
                  
                  
            res.json({success:true , connections , followers , following , pendingConnections});
            
       } catch (error) {
            console.log(error);
            res.json({success:false , message:error.message});
       }
   }
  // accept connection request
   export const acceptConnectionRequest = async (req, res) => {
       try {
            const {userId} = req.auth();
            const {id} = req.body;
            const connection = await Connection.findOne({from_user_id:id , to_user_id:userId});
               if(!connection){
                  return res.json({success:false , message:"Connection request not found"});
               }
                 const user = await User.findById(userId);
                 user.connections.push(id);
                  await user.save();

                  const touser = await User.findById(id);
                  touser.connections.push(userId);
                  await touser.save();
               connection.status = 'accepted';
               await connection.save();

            res.json({success:true , message:"Connection request accepted"});

       } catch (error) {
           console.log(error);
            res.json({success:false , message:error.message});
       }
   }

   // get user profile
   export const getUserProfile = async (req, res) => {
       try {
            const {profileId} = req.body
             const profile = await User.findById(profileId)
              if(!profile){
                   return res.json({success:false , message:"Profile not found"});
              }
           const posts = await Post.find({user:profileId}).populate('user')
            res.json({success:true , profile , posts});
       } catch (error) {
         console.log(error);
            res.json({success:false , message:error.message});
       }
   }