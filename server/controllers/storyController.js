import fs from 'fs';
import imagekit from '../configs/imagekit.js';
import Story from '../models/Story.js';
import User from '../models/User.js';
import { inngest } from '../inngest/index.js';
// add user story

export const addUserStory = async (req, res) => {
     try {
        const {userId} = req.auth();
        const {content , media_type , background_color} = req.body;
        const media = req.file
        let media_url = ''
        // upload media to imagekit
        if(media_type === 'image' || media_type === 'video'){
            const fileBuffer = fs.readFileSync(media.path);
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: media.originalname,
                
            })
             media_url = response.url;
        }
        // create story
          const story = await Story.create({
            user: userId,
            content,
            media_url,
            media_type,
            background_color
          })
           /**
    
            * Story banne ke baad Inngest background event emit kiya jata hai.
            * [Bug Fix #2]: Pehle yahan 'app/story-delete' (hyphen) bheja ja raha tha jabki Inngest listener 'app/story.delete' (dot) expect kar raha tha.
            * Is mismatch ki wajah se stories 24 ghante baad auto-delete nahi ho pa rahi thi. Ab match kar diya gaya hai.
            */
           await inngest.send({
             name: 'app/story.delete',
             data: {storyId: story._id}
           });
           res.status(201).json({success: true, story, message: "Story added successfully"});
     } catch (error) {
         console.log(error);
         res.json({success:false , message:error.message});
     }
}

// get user stories
export const getStories = async (req, res) => {
     try {
        const {userId} = req.auth();
         const user = await User.findById(userId);
            const userIds = [userId ,...user.connections, ...user.following];
            const stories = await Story.find({user: {$in: userIds}}).populate('user').sort({createdAt: -1});
            res.json({success:true , stories});
        
     } catch (error) {
        console.log(error);
         res.json({success:false , message:error.message});
     }
}