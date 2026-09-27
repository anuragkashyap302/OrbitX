import fs from 'fs';
import imagekit from '../configs/imagekit.js';
import Message from '../models/Message.js';
// create an empty object to store ss event connections
const connections = {};

/**
 * 
 * Server-Sent Events (SSE) endpoint jo client ko real-time message stream provide karta hai.
 * [Bug Fix #8 & Security Hardening]:
 * 1. Pehle bina kisi validation ke koi bhi invalid request open connection bana leti thi.
 * 2. Ab check lagaya hai ki userId exist karti ho aur valid string ho.
 * 3. Connection keep-alive headers aur proper client disconnect cleanup ensure kiya gaya hai.
 * Note: Phase 3 me hum is unidirectional SSE ko fully-authenticated bi-directional Socket.IO se upgrade karenge.
 */
export const sseController = (req, res) => {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(400).json({ success: false, message: "Valid userId parameter is required" });
    }

    console.log('SSE Client Connected:', userId);

    // Set standard SSE streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering

    // Client response object ko active connections me map karo
    connections[userId] = res;

    // Initial handshake ping
    res.write('event: connected\ndata: {"status": "connected", "userId": "' + userId + '"}\n\n');

    // Handle client disconnect / network drop
    req.on('close', () => {
        delete connections[userId];
        console.log('SSE Client Disconnected:', userId);
    });
}

// send message
 export const sendMessage = async  (req , res) => {
       try {
         const {userId} = req.auth();
            const {to_user_id , text} = req.body;
             const image = req.file;
             let media_url = '';
             let message_type = image ? 'image' : 'text';
             // upload image to imagekit if message type is image
             if(message_type === 'image'){
                 const fileBuffer = fs.readFileSync(image.path);
                 const response = await imagekit.upload({
                     file: fileBuffer,
                     fileName: image.originalname,
             })
                media_url = imagekit.url({
                     path: response.filePath,
                        transformation: [
                            {quality : 'auto'},
                            {format : 'webp'},
                            {width : '1280'}
                        ]
                })

            }
             const message = await Message.create({
                from_user_id: userId,
                to_user_id,
                text,
                 message_type,
                media_url,
               
             })
              res.json({success:true , message});
                // send sse event to the receiver if connected
                const messageWithUserData = await Message.findById(message._id).populate('from_user_id');
                 if(connections[to_user_id]){
                    connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`);
                 }
       } catch (error) {
            console.log(error);
            res.json({success:false , message:error.message});
       }
 }

// get messages between two users
    export const getChatMessages = async (req , res) => {
         try {
             const {userId} = req.auth();
              const {to_user_id} = req.body;
                const messages = await Message.find({
                    $or: [
                        {from_user_id: userId , to_user_id},
                        {from_user_id: to_user_id , to_user_id: userId}
                    ]
                }).sort({createdAt: -1})
                // mark as sen
                await Message.updateMany({
                    from_user_id: to_user_id,
                    to_user_id: userId,
                } , {seen:true});

                 res.json({success:true , messages});
         } catch (error) {
            console.log(error);
            res.json({success:false , message:error.message});
         }
    }

    export const getUserRecentMessages = async (req , res) => {
         try {
            const { userId } = req.auth();
            const messages = await Message.find({to_user_id: userId}).populate('from_user_id to_user_id').sort({createdAt: -1});
            res.json ({success: true , messages})
         } catch (error) {
    
            res.json({success:false , message:error.message});
         }
    }