import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodemailer.js";
import Story from "../models/Story.js";
import Message from "../models/Message.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "pingup-apps" });
//  ingest funtion to save data
 const syncUserCreation = inngest.createFunction(
     { id: 'sync-user-from-clerk'}, 
     { event: 'clerk/user.created' },
      async ({event})=>{
         const { id , first_name , last_name , email_addresses , image_url} = event.data;
          let username = email_addresses[0].email_address.split('@')[0];
          // check if username already exists
           const user = await User.findOne({username});
            if(user){
               username = username + Math.floor(Math.random() * 10000);
            }
             const userData = {
                _id: id,
                email: email_addresses[0].email_address,
                full_name: first_name + ' ' + last_name,
                profile_picture: image_url,
                username,
             }
                await User.create(userData);
      })
  // to update user data
  const syncUserUpdation = inngest.createFunction(
     { id: 'update-user-from-clerk'}, 
     { event: 'clerk/user.updated' },
      async ({event})=>{
         const { id , first_name , last_name , email_addresses , image_url} = event.data;
         
             const updateduserData = {
                email: email_addresses[0].email_address,
                full_name: first_name + ' ' + last_name,
                profile_picture: image_url,
                
             }
             await User.findByIdAndUpdate(id, updateduserData);
                
      })
      // delte user data
      const syncUserDeletion = inngest.createFunction(
     { id: 'delete-user-with-clerk'}, 
     { event: 'clerk/user.deleted' },
      async ({event})=>{
         const { id} = event.data;
          await User.findByIdAndDelete(id);
      })

      // send email when conncetion request is received
      const sendNewConnectionRequestReminder = inngest.createFunction(
       { id: 'send-new-connection-request-reminder'},
         { event: 'app/connection-request' },
            async ({event, step})=>{
               const {connectionId} = event.data;
               await step.run('send-connection-request-mail' , async ()=>{
                  const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id');
                  const subject = 'New Connection Request on PingUp';
                  const body = `
                  <h1>You have a new connection request!</h1>
                  <p><strong>${connection.from_user_id.full_name} (@${connection.from_user_id.username})</strong> has sent you a connection request.</p>

                  <p>Log in to your PingUp account to accept or decline the request.</p>
                  `;
                 await sendEmail({
                  to: connection.to_user_id.email,
                  subject,
                  body
               })
                
                })
                const in24Hours = new Date(Date.now() +24 * 60 * 60 * 1000);
                await step.sleepUntil( "wait-for-24-hours" ,in24Hours);
                 await step.run('send-connection-request-reminder' , async()=>{
                  const connection = await Connection.findById(connectionId).populate('from_user_id to_user_id');
                  // check if connection is accepted
                  if(connection.status === 'accepted'){
                      return {message:"Connection already accepted"};
                  }
                   const subject = 'New Connection Request on OrbitX';
                  const body = `
                  <h1>You have a new connection request!</h1>
                  <p><strong>${connection.from_user_id.full_name} (@${connection.from_user_id.username})</strong> has sent you a connection request.</p>

                  <p>Log in to your OrbitX account to accept or decline the request.</p>
                  `;
                 await sendEmail({
                  to: connection.to_user_id.email,
                  subject,
                  body
               })
                   return {message:"Reminder email sent"}
                 })
            }

      )

       /**
        * 💡 [Hinglish Explanation]:
        * Inngest background function jo 24 ghante baad user ki story ko automatically database se delete karta hai.
        * Event name 'app/story.delete' controller se match hona compulsory hai taaki listener sahi se trigger ho.
        */
  const deleteStory = inngest.createFunction(
      {id: 'story-delete'},
      {event: 'app/story.delete'},
      async ({event , step})=>{
         const {storyId} = event.data;
           const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);
           // 24 ghante ke liye job ko pause rakho bina server memory block kiye
           await step.sleepUntil("wait-for-24-hours", in24Hours);
           await step.run('delete-story', async()=>{
              await Story.findByIdAndDelete(storyId);
              return {message: "Story deleted successfully after 24h"}
           })
      }
  )

/**
 * 
 * Ye cron job har roz subah 9 AM EST par chalta hai aur jinke unread messages hain unhe email bhejta hai.
 * [Bug Fix #1]: Pehle yahan 'for(const userId in object)' likha tha, jisse runtime pe ReferenceError throw hota tha.
 * Ab 'unseencount' ke keys par loop chalaya hai aur check kiya hai ki user database me exist karta hai ya nahi.
 */
const sendNotificationofUnseenMessages = inngest.createFunction(
      {id: 'send-unseen-messages-notification'},
      {cron : 'TZ=America/New_York 0 9 * * *' }, // every day at 9 AM EST
      async ({step})=>{
         // 1. Unseen messages fetch karo recipient user details ke sath
         const messages = await Message.find({seen: false}).populate('to_user_id');
         const unseencount = {};
         
         // 2. Har user ke kitne unread messages hain count accumulate karo
         messages.forEach(message => {
            if (message.to_user_id && message.to_user_id._id) {
               const id = message.to_user_id._id.toString();
               unseencount[id] = (unseencount[id] || 0) + 1;
            }
         });

         // 3. Har user ko loop karke notification email bhejo
         for (const userId of Object.keys(unseencount)) {
            const user = await User.findById(userId);
            // Edge Case: Agar user ne account delete kar diya ho to skip karo
            if (!user || !user.email) continue;

            const count = unseencount[userId];
            const subject = `You have ${count} unseen message${count > 1 ? 's' : ''} on OrbitX`;
            const body = `
            <h1>You have ${count} unseen messages on OrbitX!</h1>
            <p>Hi ${user.full_name || user.username}, don't keep your connections waiting.</p>
            <p>Log in to your OrbitX account to read your messages.</p>
            `;
            await sendEmail({
               to: user.email,
               subject,
               body
            });
         }
         return {message: "Unseen message notifications sent successfully"};
      }
)

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation , syncUserUpdation , syncUserDeletion , sendNewConnectionRequestReminder, deleteStory, sendNotificationofUnseenMessages];