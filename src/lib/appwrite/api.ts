import { ID, Query } from "appwrite";
import { appwriteConfig, account, databases, storage, avatars, } from "./config";
import { IUpdatePost, INewPost, INewUser, IUpdateUser } from "@/types";
import { ReactNode } from "react";

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (!newAccount) throw Error;

    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    return newUser;
  } catch (error) {
    console.log(error);
    return error;
  }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  username?: string;
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      user
    );

    return newUser;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createEmailSession(user.email, user.password);

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    if (!currentAccount) throw Error;
    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
      );
      
    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  try {
    const uploadedFile = await uploadFile(post.file[0]);

    if (!uploadedFile) throw Error;

    const fileUrl = getFilePreview(uploadedFile.$id);
    if (!fileUrl) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: fileUrl,
        imageId: uploadedFile.$id,
        location: post.location,
        tags: tags,
      }
    );

    if (!newPost) {
      await deleteFile(uploadedFile.$id);
      throw Error;
    }

    return newPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FILE URL
export function getFilePreview(fileId: string) {
  try {
    const fileUrl = storage.getFilePreview(
      appwriteConfig.storageId,
      fileId,
      2000,
      2000,
      "top",
      100
    );

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);
    return { status: "ok" };
  } catch (error) {
    console.log(error);
    throw error; 
  }
}

// ============================== DELETE POST
export async function deletePost(postId?: string, imageId?: string) {
  if (!postId || !imageId) return;

  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!statusCode) throw Error;

    await deleteFile(imageId);

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
    throw error; 
  }
}


// ============================== GET POSTS
export async function searchPosts(searchTerm: string) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.search("caption", searchTerm)]
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam.toString()));
  }

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POST BY ID
export async function getPostById(postId?: string) {
  if (!postId) throw Error;

  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let image = {
      imageUrl: post.imageUrl,
      imageId: post.imageId,
    };

    if (hasFileToUpdate) {
      const uploadedFile = await uploadFile(post.file[0]);
      if (!uploadedFile) throw Error;

      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
        location: post.location,
        tags: tags,
      }
    );

    if (!updatedPost) {
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }

      throw Error;
    }

    if (hasFileToUpdate) {
      await deleteFile(post.imageId);
    }

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}



// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
    throw error; // Propagate the error
  }
}

// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) return;

  try {
    const post = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    );

    if (!post) throw Error;

    return post;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)
export async function getRecentPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)]
    );

    if (!posts) throw Error;

    return posts;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(limit?: number) {
  const queries: any[] = [Query.orderDesc("$createdAt")];

  if (limit) {
    queries.push(Query.limit(limit));
  }

  try {
    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      queries
    );

    if (!users) throw Error;

    return users;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  try {

    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    if (!user) throw new Error('User not found');


    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}



// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;

      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      {
        name: user.name,
        bio: user.bio,
        imageUrl: image.imageUrl,
        imageId: image.imageId,
      }
    );

    if (!updatedUser) {
      if (hasFileToUpdate) {
        await deleteFile(image.imageId);
      }
      throw Error;
    }

    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error) {
    console.log(error);
  }
}

// ===========================================================
// FOLLOW
// ===========================================================

// ============================== FOLLOW USER
export async function followUser(targetUserId: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.$id) {
      throw new Error('Invalid or missing current user data');
    }

    if (!Array.isArray(currentUser.followingId)) {
      currentUser.followingId = [];
    }

    if (!currentUser.followingId.includes(targetUserId)) {
      currentUser.followingId.push(targetUserId);

      const updatedCurrentUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentUser.$id,
        { followingId: currentUser.followingId }
      );

      if (!updatedCurrentUser) {
        throw new Error('Failed to update current user data while following user');
      }

      const targetUser = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        targetUserId
      );

      if (!targetUser) {
        throw new Error(`Target user with ID ${targetUserId} not found`);
      }

      if (!Array.isArray(targetUser.followerId)) {
        targetUser.followerId = [];
      }

      targetUser.followerId.push(currentUser.$id);

      const updatedTargetUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        targetUserId,
        { followerId: targetUser.followerId }
      );

      if (!updatedTargetUser) {
        throw new Error(`Failed to update target user ${targetUserId} with follower ${currentUser.$id}`);
      }

      return updatedCurrentUser;
    }

    return currentUser;
  } catch (error: any) {
    console.log('Error following user:', error.message);
    throw error;
  }
}


// ============================== UNFOLLOW USER
export async function unfollowUser(userIdToUnfollow: string) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.followingId) {
      throw new Error('Invalid or missing followingId in the current user data');
    }

    if (currentUser.followingId.includes(userIdToUnfollow)) {
      const updatedUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        currentUser.$id,
        {
          followingId: currentUser.followingId.filter((id: string) => id !== userIdToUnfollow),
        }
      );

      if (!updatedUser) {
        throw new Error('Failed to update user data while unfollowing user');
      }

      const targetUser = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userIdToUnfollow
      );

      if (!targetUser) {
        throw new Error(`Target user with ID ${userIdToUnfollow} not found`);
      }

      targetUser.followerId = targetUser.followerId.filter((id: string) => id !== currentUser.$id);

      const updatedTargetUser = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userIdToUnfollow,
        { followerId: targetUser.followerId }
      );

      if (!updatedTargetUser) {
        throw new Error(`Failed to update target user ${userIdToUnfollow} by removing follower ${currentUser.$id}`);
      }

      return updatedUser;
    }

    return currentUser;
  } catch (error: any) {
    console.log('Error unfollowing user:', error.message);
    return null; 
  }
}


// ============================== GET FOLLOWINGS
export async function isFollowingA(targetUserId: string): Promise<boolean> {
  try {
    
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.followingId) {
      return false; 
    }

    const isFollowing = currentUser.followingId.includes(targetUserId);
    return isFollowing;
  } catch (error) {
    console.error('Error checking isFollowing status:', error);
    throw error;
  }
}
// ============================== GET FOLLOWERS COUNT
export async function getFollowersCount(userId: string): Promise<number> {
  try {
    const user = await getUserById(userId);
    if (!user || !user.followerId) return 0;
    return user.followerId.length;
  } catch (error) {
    console.log('Error fetching followers count:', error);
    return 0;
  }
}

// ============================== GET FOLLOWINGS COUNT
export async function getFollowingsCount(userId: string): Promise<number> {
  try {
    const user = await getUserById(userId);
    if (!user || !user.followingId) return 0;
    return user.followingId.length;
  } catch (error) {
    console.log('Error fetching followings count:', error);
    return 0;
  }
}

// ===========================================================
// COMMENTS
// ===========================================================

// ============================= CREATE UNIQUE ID
function generateUniqueId() {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000); 
  return `${timestamp}-${random}`;
}

// ============================= CREATE COMMENTS
export async function createComment(commentText: string, postId: string): Promise<void> {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.$id) {
      throw new Error('Invalid or missing current user data');
    }

    const { commentsCollectionId } = appwriteConfig;

    const commentId = generateUniqueId();

    const commentData = {
      commentId,
      userId: currentUser.$id,
      commentText,
      createdAt: new Date().toISOString(),
      postId,
    };

    await databases.createDocument(
      appwriteConfig.databaseId,
      commentsCollectionId,
      commentId,
      commentData
    );
    return; 
  } catch (error) {
    throw error;
  }
}

// ============================= GET COMMENTS
export interface CommentData {
  userName: ReactNode;
  userImage: string | undefined;
  commentId: string;
  userId: string;
  postId: string;
  commentText: string;
  createdAt: string;
}
// ============================= GET COMMENT DATA

export async function getCommentsData(): Promise<CommentData[]> {
  try {
    const { commentsCollectionId } = appwriteConfig;

    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      commentsCollectionId
    );

    const commentsData: CommentData[] = [];

    for (const document of response.documents) {
      try {
        const {
          $id,
          userId,
          postId,
          commentText,
          createdAt,
        } = document;

        if ($id && userId && postId && commentText !== undefined && createdAt) {
          const userDetails = await getUserById(userId);

          const userName = userDetails?.name || 'Unknown';
          const userImage = userDetails?.imageUrl || '/assets/icons/profile-placeholder.svg';

          commentsData.push({
            commentId: $id,
            userId,
            userName,
            userImage,
            postId,
            commentText,
            createdAt,
          });
        } 
      } catch (error) {
      }
    }

    return commentsData;
  } catch (error) {
    throw error;
  }
}


// ============================= DELETE COMMENT
export async function deleteComment(commentId: string): Promise<void> {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      commentId
    );
  } catch (error) {
    throw error;
  }
}

// ============================= EDIT COMMENT
export async function editComment(commentId: string, data: { commentText: string }): Promise<CommentData> {
  try {
    const { commentsCollectionId } = appwriteConfig;

    const commentsData = await getCommentsData();

    const commentIndex = commentsData.findIndex(comment => comment.commentId === commentId);

    if (commentIndex === -1) {
      throw new Error("Comment not found");
    }

    commentsData[commentIndex].commentText = data.commentText;

    await databases.updateDocument(
      appwriteConfig.databaseId,
      commentsCollectionId,
      commentId,
      { commentText: data.commentText } 
    );

    return commentsData[commentIndex];
  } catch (error) {
    throw error;
  }
}

