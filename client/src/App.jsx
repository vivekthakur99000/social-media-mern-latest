import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Messages from "./pages/Messages";
import ChatBox from "./pages/ChatBox";
import Connections from "./pages/Connections";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import CreatePost from "./pages/CreatePost";
import { useUser, useAuth } from "@clerk/clerk-react";
import Layout from "./pages/Layout";
import toast, { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { fetchUser } from "./features/user/userSlice";
import { fetchConnection } from "./features/connections/connectionSlice";
import { useRef } from "react";
import { addMessages } from "./features/messages/messagesSlice";
import { useLocation } from "react-router-dom";
import Notification from "./components/Notification";

const App = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const token = await getToken();
        dispatch(fetchUser(token));
        dispatch(fetchConnection(token));
      }
    };

    fetchData();
  }, [user, getToken, dispatch]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Setup EventSource for real-time messages
  useEffect(() => {
    if (!user) return; // only setup if user exists

    let eventSource;

    const setupEventSource = async () => {
      try {
        const token = await getToken();
        const baseURL = import.meta.env.VITE_BASEURL || "http://localhost:4000";

        eventSource = new EventSource(
          `${baseURL}/api/message/${user._id}?token=${token}`
        );

        eventSource.onmessage = (event) => {
          try {
            const messageData = JSON.parse(event.data);
            // only add message if currently viewing that chat
            if (pathnameRef.current === `/messages/${messageData.from_user_id._id}`) {
              dispatch(addMessages(messageData));
            }else{
              toast.custom((t) => (
                <Notification t={t} message={messageData}  />
              ), {position : 'bottom-right'})
            }
          } catch (error) {
            console.error("Failed to parse message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("EventSource error:", error);
          eventSource.close();
        };
      } catch (error) {
        console.error("Failed to setup EventSource:", error);
      }
    };

    setupEventSource();

    // cleanup on unmount or when user changes
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user, getToken, dispatch]);

  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/" element={user ? <Layout /> : <Login />}>
          <Route index element={<Feed />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:id" element={<ChatBox />} />
          <Route path="connections" element={<Connections />} />
          <Route path="discover" element={<Discover />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:profileId" element={<Profile />} />
          <Route path="create-post" element={<CreatePost />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
