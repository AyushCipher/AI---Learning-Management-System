import uploadOnCloudinary from "../configs/cloudinary.js"
import Course from "../models/courseModel.js"
import Lecture from "../models/lectureModel.js"
import User from "../models/userModel.js"

export const createCourse = async (req, res) => {
  try {
    const { title, category } = req.body;

    if (!title || !category) {
      return res.status(400).json({ message: "Title and Category is required!" });
    }

    let thumbnailUrl = null;

    // if image is uploaded
    if (req.file) {
      thumbnailUrl = await uploadOnCloudinary(req.file.path);
    }

    const course = await Course.create({
      title,
      category,
      creator: req.userId,
      thumbnail: thumbnailUrl
    });

    return res.status(201).json(course);

  } catch (error) {
    return res.status(500).json({
      message: `Failed to create course error: ${error}`
    });
  }
};




export const getPublishedCourses = async (req,res) => {
    try {
        const courses = await Course.find({isPublished: true})
          .populate("lectures")
          .populate({
            path: "reviews",
            populate: { path: "user", select: "name photoUrl enrolledCourses" }
          });
        if(!courses){
            return res.status(404).json({message:"Course not found"})
        }
        return res.status(200).json(courses)
    } catch (error) {
        return res.status(500).json({message:`Failed to get all courses: ${error}`})
    }
}


export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.userId
        const courses = await Course.find({creator: userId})
        
        if(!courses){
            return res.status(404).json({message:"Course not found"})
        }

        return res.status(200).json(courses)
        
    } catch (error) {
        return res.status(500).json({message:`Failed to get creator courses: ${error}`})
    }
}


export const editCourse = async (req,res) => {
    try {
        const {courseId} = req.params;
        const {title, subTitle, description, category, level, price, isPublished} = req.body;
        
        console.log("Received isPublished:", isPublished, "Type:", typeof isPublished);
        
        // Convert isPublished from string to boolean (FormData sends strings)
        const isPublishedBool = isPublished === 'true' || isPublished === true;
        
        console.log("Converted isPublishedBool:", isPublishedBool);
        
        let updateData = { title, subTitle, description, category, level, price, isPublished: isPublishedBool }

        if (req.file) {
            updateData.thumbnail = await uploadOnCloudinary(req.file.path);
        }

        console.log("Update data:", updateData);

        const course = await Course.findByIdAndUpdate(courseId, updateData, {new:true});

        console.log("Updated course isPublished:", course?.isPublished);

        if (!course) {
            return res.status(404).json({message:"Course not found"});
        }

        return res.status(200).json(course);

    } catch (error) {
        return res.status(500).json({message:`Failed to update course: ${error}`})
    }
}



export const getCourseById = async (req,res) => {
    try {
        const {courseId} = req.params
        let course = await Course.findById(courseId)
          .populate("lectures")
          .populate({
            path: "reviews",
            populate: { path: "user", select: "name photoUrl enrolledCourses" }
          });
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }
        return res.status(200).json(course)
        
    } catch (error) {
        return res.status(500).json({message:`Failed to get course error:${error}`})
    }
}


export const removeCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const course = await Course.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    await course.deleteOne();
    return res.status(200).json({ message: "Course Removed Successfully"});
  } catch (error) {
    console.error(error);
    return res.status(500).json({message:`Failed to remove course error: ${error}`})
  }
};



//create lecture

export const createLecture = async (req,res) => {
    try {
        const {lectureTitle} = req.body
        const {courseId} = req.params

        if(!lectureTitle || !courseId){
            return res.status(400).json({message:"Lecture Title is required"})
        }

        const lecture = await Lecture.create({lectureTitle})
        const course = await Course.findById(courseId)
        
        if(course){
            course.lectures.push(lecture._id)    
        }

        await course.populate("lectures")
        await course.save()
        return res.status(201).json({lecture,course})
        
    } catch (error) {
        return res.status(500).json({message:`Failed to Create Lecture error: ${error}`})
    }
    
}


export const getCourseLecture = async (req,res) => {
    try {
        const {courseId} = req.params
        const course = await Course.findById(courseId)
        if(!course){
            return res.status(404).json({message:"Course not found"})
        }
        await course.populate("lectures")
        await course.save()
        return res.status(200).json(course)
    } catch (error) {
        return res.status(500).json({message:`Failed to get Lectures ${error}`})
    }
}


export const editLecture = async (req,res) => {
    try {
        const {lectureId} = req.params
        const {isPreviewFree, lectureTitle} = req.body
        const lecture = await Lecture.findById(lectureId)

        if(!lecture){
            return res.status(404).json({ message:"Lecture not found" })
        }

        let videoUrl;

        if(req.file){
            videoUrl = await uploadOnCloudinary(req.file.path)
            lecture.videoUrl = videoUrl
        }

        if(lectureTitle){
            lecture.lectureTitle = lectureTitle
        }

        // Convert string "true"/"false" to boolean (FormData sends strings)
        lecture.isPreviewFree = isPreviewFree === 'true' || isPreviewFree === true
        
        await lecture.save()
        return res.status(200).json(lecture)
    
    } catch (error) {
        return res.status(500).json({ message:`Failed to edit Lectures ${error}` })
    }
}


export const removeLecture = async (req,res) => {
    try {
        const {lectureId} = req.params
        const lecture = await Lecture.findByIdAndDelete(lectureId)
        
        if(!lecture){
            return res.status(404).json({ message:"Lecture not found" })
        }

        // Remove the lecture from associated course
        await Course.updateOne(
            {lectures: lectureId},
            {$pull:{lectures: lectureId}}
        )
        return res.status(200).json({message:"Lecture Remove Successfully"})
    
    } catch (error) {
        return res.status(500).json({message:`Failed to remove Lectures ${error}`})
    }
}



// Get Creator data

// controllers/userController.js

export const getCreatorById = async (req, res) => {
    try {
        const {userId} = req.body;

        const user = await User.findById(userId).select("-password"); // Exclude password

        if (!user) {
        return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json( user );

    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ message: "get Creator error" });
    }
};




