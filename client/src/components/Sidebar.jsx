import React from "react";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import MenuItems from "./MenuItems";

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {

  const navigate = useNavigate()

  return (
    <div
      className={`w-60 xl:w-72 bg-white border-r border-gray-700 flex flex-col justify-between items-center top-0 bottom-0 z-20 ${
        sidebarOpen ? "translate-x-0" : "max-sm:translate-x-full"
      } transition-all duration-300 ease-in-out `}
    >
      <div className="w-full">
        <img onClick={() => navigate("/")} src={assets.logo} className="w-26 ml-7 my-2 cursor-pointer " alt="" /> 
        <hr className="border-gray-300 mb-8" />
        <MenuItems setSidebarOpen={setSidebarOpen}/>
      </div>
    </div>
  );
};

export default Sidebar;
