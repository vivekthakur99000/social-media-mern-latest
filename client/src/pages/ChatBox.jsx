import React, { useEffect, useRef, useState } from "react";
import { dummyMessagesData, dummyUserData } from "../assets/assets";
import { ImageIcon, SendHorizonal, SendIcon, Table } from "lucide-react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useDispatch } from "react-redux";
import api from "../api/axios";
import { addMessages, fetchMessages, resetMessages } from "../features/messages/messagesSlice";
import { toast } from "react-hot-toast";

const ChatBox = () => {
  const { messages = [] } = useSelector((state) => state.messages || {});
  const { userId } = useParams();
  const { getToken } = useAuth();
  const dispatch = useDispatch();

  const [text, setText] = useState("");
  const [image, setImages] = useState(null);
  const [user, setUser] = useState(null);

  const messageEndRef = useRef(null);

  const connections = useSelector((state) => state.connections?.connections || []);

  const fetchUserMessages = async () => {
    try {
      const token = await getToken();
      dispatch(fetchMessages({ token, userId }));
    } catch (error) {
      toast.error("Failed to fetch messages: " + error.message);
    }
  };

  // MOVED OUTSIDE sendMessage - fetch messages when userId changes
  useEffect(() => {
    fetchUserMessages();
    return () => dispatch(resetMessages());
  }, [userId, getToken, dispatch]);

  // set chat user from connections (use string comparison)
  useEffect(() => {
    if (Array.isArray(connections) && connections.length > 0) {
      const chatUser = connections.find((conn) => String(conn._id) === String(userId));
      setUser(chatUser || null);
      console.log("Found user:", chatUser);
    } else {
      setUser(null);
    }
  }, [connections, userId]);

  // scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    try {
      if (!text && !image) return;
      const token = await getToken();

      const formData = new FormData();
      formData.append("to_user_id", userId);
      formData.append("text", text);
      image && formData.append("image", image);

      const { data } = await api.post("/api/message/send", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setText("");
        setImages(null);
        dispatch(addMessages(data.message));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error("Failed to send message: " + error.message);
    }
  };

  // guard render until user loads
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-2 p-2 md:px-10 xl:pl-42 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-300">
        <img
          src={user?.profile_picture || ""}
          className="size-8 rounded-full"
          alt={user?.full_name || "user"}
        />
        <div>
          <p className="font-medium">{user?.full_name || "User"}</p>
          <p className="text-sm text-gray-500 -mt-1.5">@{user?.username || "unknown"}</p>
        </div>
      </div>

      <div className="p-5 md:px-10 h-full overflow-y-scroll">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages
            .slice()
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map((message, index) => {
              const isOutgoing = String(message.to_user_id) === String(user._id);
              return (
                <div
                  className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}
                  key={message._id || index}
                >
                  <div
                    className={`p-2 text-sm max-w-sm bg-white text-slate-700 rounded-lg shadow ${
                      isOutgoing ? "rounded-br-none" : "rounded-bl-none"
                    }`}
                  >
                    {message.message_type === "image" && message.media_url && (
                      <img
                        src={message.media_url}
                        className="w-full max-w-sm rounded-lg mb-1"
                        alt=""
                      />
                    )}
                    <p>{message.text}</p>
                  </div>
                </div>
              );
            })}
          <div ref={messageEndRef} />
        </div>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-3 pl-5 p-1.5 bg-white w-full max-w-xl mx-auto border border-gray-200 shadow rounded-full mb-5">
          <input
            type="text"
            className="flex-1 outline-none text-slate-700"
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            onChange={(e) => setText(e.target.value)}
            value={text}
          />
          <label htmlFor="image">
            {image ? (
              <img src={URL.createObjectURL(image)} alt="" className="h-8 rounded" />
            ) : (
              <ImageIcon className="size-7 text-gray-400 cursor-pointer" />
            )}
            <input
              type="file"
              id="image"
              accept="image/*"
              hidden
              onChange={(e) => setImages(e.target.files[0])}
            />
          </label>
          <button
            onClick={sendMessage}
            className="bg-gradient-to-b from-indigo-500 to-purple-600 hover:from-indigo-700 hover:to-purple-800 active:scale-95 cursor-pointer text-white p-2 rounded-full"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
