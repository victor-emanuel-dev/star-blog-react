import { FC, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Alert from "../components/Alert";
import PostForm from "../components/PostForm";
import Spinner from "../components/Spinner";
import { getPostById, updatePost } from "../services/api";
import { Post } from "../types"; // Use main Post type

// Type received FROM PostForm's onSubmit (matches PostInputData in api.ts)
type SubmitDataFromForm = Pick<
  Post,
  "title" | "content" | "date" | "categories"
>;

// Type expected BY PostForm's initialData prop
type InitialPostDataForForm =
  | (Partial<
      Omit<
        Post,
        | "id"
        | "categories"
        | "author"
        | "likes"
        | "commentCount"
        | "likedByCurrentUser"
        | "createdAt"
        | "updatedAt"
      >
    > & { categories?: string })
  | null;

const EditPostPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // State holds the actual Post data fetched from API
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to format date string into yyyy-mm-dd for input[type=date]
  const formatDateForInput = (
    dateString: string | undefined | null
  ): string => {
    const fallbackDate = new Date().toISOString().slice(0, 10);
    if (!dateString) return fallbackDate;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return fallbackDate;
      }
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return fallbackDate;
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Post ID not provided.");
      setIsLoading(false);
      return;
    }
    const fetchPostData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetched data IS the Post type
        const fetchedPost = await getPostById(id);
        setPost(fetchedPost); // Store the actual fetched post data
      } catch (err) {
        setError(
          err instanceof Error
            ? `Error loading post: ${err.message}`
            : "Unknown error loading post."
        );
        setPost(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPostData();
  }, [id]);

  // Handler now accepts the correct type from PostForm
  const handleUpdatePost = async (dataFromForm: SubmitDataFromForm) => {
    if (!id || !post) {
      setError("Cannot update: ID or post missing.");
      return;
    }
  
    setIsSaving(true);
    setError(null);
  
    try {
      await updatePost(id, {
        ...dataFromForm,
        author: post.author,
        likes: post.likes,
        commentCount: post.commentCount,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Error saving changes: ${err.message}`
          : "Unknown error saving."
      );
      setIsSaving(false);
    }
  };
  
  // Prepare the specific structure needed for PostForm's initialData prop
  const generateInitialFormData = (): InitialPostDataForForm => {
    if (!post) return null;
    return {
      title: post.title,
      content: post.content || "",
      date: formatDateForInput(post.date), // Format date for input
      categories: (post.categories || []).join(", "), // Convert array to string for input
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !post) {
    // Changed condition slightly
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 text-center">
        <Alert
          message={error}
          type="error"
          title="Error Loading!"
          onClose={() => setError(null)}
        />
        <Link
          to="/"
          className="text-blue-500 hover:underline mt-4 inline-block"
        >
          Back to homepage
        </Link>
      </div>
    );
  }

  if (!post) {
    // Added explicit check for post being null after loading finished without error
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 text-center">
        <p>Could not load post data.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Edit Post</h1>
        {/* Display saving errors specifically */}
        {error && isSaving && (
          <Alert
            message={error}
            type="error"
            title="Error Saving!"
            onClose={() => setError(null)}
          />
        )}

        <PostForm
          onSubmit={handleUpdatePost} // handleUpdatePost now accepts correct type
          initialData={generateInitialFormData()} // Generate form-specific data structure
          isLoading={isSaving}
          submitButtonText="Update Post"
        />
      </div>
    </div>
  );
};
export default EditPostPage;
