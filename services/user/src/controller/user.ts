import User from "../models/user.js";
import jwt from "jsonwebtoken";
import TryCatch from "../utils/TryCatch.js";
import type { AuthenticatedRequest } from "../middleware/isAuth.js";
export const loginUser = TryCatch(async (req, res) => {
  

  const { email, name, picture } = req.body;

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
