import User from "../models/user.js";
import jwt from "jsonwebtoken";
import TryCatch from "../utils/TryCatch.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
import getbuffer from "../middleware/datauri.js";
import { v2 as cloudinary } from 'cloudinary'
import { oauthclient } from "../utils/GoogleConfig.js";
import axios from "axios";

export const loginUser = TryCatch(async (req, res) => {
  const { code } = req.body

  if (!code) {
    res.status(400).json({
      message: "Authroizatio code is required"
    })
  }
  console.log(code)
  const googleRes = await oauthclient.getToken(code)

  oauthclient.setCredentials(googleRes.tokens)

  const userRes = await axios.get(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
  ); 
  const { email, name, picture } = userRes.data;

  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      image: picture,
    });
  }

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, {
    expiresIn: "5d",
  });

  res.status(200).json({
    message: "Login success",
    token,
    user,
  });
});

export const myProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  res.json(user);
});

export const getUserProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404).json({
      message: "No user with this id",
    });
    return;
  }

  res.json(user);
});


export const updateUser = TryCatch(async (req: AuthenticatedRequest, res) => {

  const { name, instagram, facebook, linkedin, bio } = req.body;

  const user = await User.findByIdAndUpdate(req.user?._id, {
    name,
    instagram,
    facebook,
    linkedin,
    bio
  }, { new: true })

  const token = jwt.sign({ user }, process.env.JWT_SEC as string, { expiresIn: "5d" })


  return res.json({
    message: "Updated Successfully",
    user,
    token
  })


})

export const uploadProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  // console.log(first)
  const file = req.file

  if (!file) {
    res.status(400).json({
      message: "No Image found"
    })
    return;
  }

  const filebuffer = getbuffer(file)

  if (!filebuffer || !filebuffer.content) {

    return res.status(400).json({
      message: "Failed to generate buffer"
    })
  }

  const cloud = await cloudinary.uploader.upload(filebuffer.content, {
    folder: "blogs"
  })

  const user = await User.findByIdAndUpdate(req.user?._id, {
    image: cloud.secure_url
  }, { new: true })

  const token = jwt.sign({ user }, process.env.JWT_SEC!, {
    expiresIn: "5d"
  })

  res.json({
    message: "User profile pic updated",
    token,
    user
  })

})