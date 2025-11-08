import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "pingup-app" });

// inngest function to save thhe user data to database

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    let username = email_addresses[0].email_address.split("@")[0];

    // check availability of username

    const user = await User.findOne({ username });

    if (user) {
      username += username + Math.floor(Math.random() * 10000);
    }

    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      full_name: first_name + " " + last_name,
      profile_picture: image_url,
      username,
    };

    await User.create(userData);
  }
);

// inngest function to update user data to db

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const updatedUserData = {
      email: email_addresses[0].email_address,
      full_name: first_name + " " + last_name,
      profile_picture: image_url,
    };

    await User.findByIdAndUpdate(id, updatedUserData);
  }
);

// inngest function to delete the user from the db

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;

    await User.findByIdAndDelete(id);
  }
);

// inngest function to send reminder when a new connection request is added

const sendNewConnectionRequestReminder = inngest.createFunction(
  { id: "send-new-connection-request-reminder" },
  { event: "app/connection-request" },
  async ({ event, step }) => {
    const { connectionId } = event.data;
    await step.run("send-connection-request-email", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id"
      );
      const subject = `New connection request`;
      const body = `
Hi ${connection.to_user_id.full_name || connection.to_user_id.username},

${connection.from_user_id.full_name || connection.from_user_id.username} (@${
        connection.from_user_id.username
      }) sent you a connection request on PingUp.

View profile: ${process.env.CLIENT_URL || "http://localhost:3000"}/profile/${
        connection.from_user_id._id
      }

Thanks,
PingUp Team

<!-- HTML fallback -->
<div>
  <p>Hi ${
    connection.to_user_id.full_name || connection.to_user_id.username
  },</p>
  <p><strong>${
    connection.from_user_id.full_name || connection.from_user_id.username
  }</strong> (@${
        connection.from_user_id.username
      }) sent you a connection request.</p>
  <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/profile/${
        connection.from_user_id._id
      }">View profile</a></p>
  <p>Thanks,<br/>PingUp Team</p>
</div>`;

      await sendEmail({
        to : connection.to_user_id.email,
        subject,
        body
      })
    });

    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await step.sleepUntil("wait-for-24-hours", in24Hours)
    await step.run('send-connection-request-reminder', async () => {
      const connection = await Connection.findById(connectionId).populate('from-user-id to-user-id')
      if(connection.status === 'accepted'){
        return {message : 'Already accepted'}
      }

      const subject = `New connection request`;
      const body = `
Hi ${connection.to_user_id.full_name || connection.to_user_id.username},

${connection.from_user_id.full_name || connection.from_user_id.username} (@${
        connection.from_user_id.username
      }) sent you a connection request on PingUp.

View profile: ${process.env.CLIENT_URL || "http://localhost:3000"}/profile/${
        connection.from_user_id._id
      }

Thanks,
PingUp Team

<!-- HTML fallback -->
<div>
  <p>Hi ${
    connection.to_user_id.full_name || connection.to_user_id.username
  },</p>
  <p><strong>${
    connection.from_user_id.full_name || connection.from_user_id.username
  }</strong> (@${
        connection.from_user_id.username
      }) sent you a connection request.</p>
  <p><a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/profile/${
        connection.from_user_id._id
      }">View profile</a></p>
  <p>Thanks,<br/>PingUp Team</p>
</div>
      `;

      await sendEmail({
        to : connection.to_user_id.email,
        subject,
        body
      })

      return {message : 'Remainder sent'}
    })
  }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [syncUserCreation, syncUserUpdation, syncUserDeletion, sendNewConnectionRequestReminder];
