import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodemailer.js";

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
                   return {message:"Reminder email sent"}
                 })
            }

      )
// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation , syncUserUpdation , syncUserDeletion , sendNewConnectionRequestReminder];