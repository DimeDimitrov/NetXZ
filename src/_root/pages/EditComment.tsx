import React, { useState } from "react";
import { Button } from "@/components/ui";

interface EditCommentProps {
    initialCommentText: string;
    onSave: (updatedCommentText: string) => void;
    onCancel: () => void;
    userName?: string | null;
    userImage?: string | null;
    createdAt?: string | null;
  }
  

  const EditComment: React.FC<EditCommentProps> = ({
    initialCommentText,
    onSave,
    onCancel,
    userName = null,
    userImage = null,
    createdAt = null,
  }) => {
    const [commentText, setCommentText] = useState(initialCommentText);
  
    const handleSave = () => {
      onSave(commentText);
    };
    
  return (
    <div className="relative grid grid-cols-1 gap-4 p-4 mb-8 border border-none rounded-lg bg-transparent shadow-lg w-full pt-5 pb-7">
      <div className="relative flex gap-4">
        <img src={userImage!} className="w-8 h-8 lg:w-12 lg:h-12 rounded-full" />
        <div className="flex flex-col w-full">
            <div className="flex flex-row justify-between">
            <p className="relative text-xl whitespace-nowrap truncate overflow-hidden">{userName!}</p>
            </div>
            <p className="text-sm">{createdAt!}</p>
        </div>
        </div>

      <textarea
        style={{ resize: 'none' }}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        className="border-none rounded-lg p-2  w-full outline-none h-20 bg-transparent"
      />
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} variant="ghost" className="mr-2 hover:bg-transparent hover:text-white">
          Save
        </Button>
        <Button onClick={onCancel} variant="ghost" className="hover:bg-transparent hover:text-white">
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default EditComment;
