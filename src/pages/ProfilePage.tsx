import {
  ChangeEvent,
  FC,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Link } from "react-router-dom";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import {
  changePassword,
  getCurrentUser,
  updateUserProfile,
} from "../services/api";
import { User } from "../types";

const BACKEND_URL = "http://localhost:4000";

const DefaultAvatar: FC<{ className?: string }> = ({
  className = "h-full w-full text-gray-400",
}) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
      clipRule="evenodd"
    />
  </svg>
);

const ProfilePage: FC = () => {
  const { token, login, user: contextUser } = useAuth();

  const [profileData, setProfileData] = useState<User | null>(contextUser);
  const [isLoading, setIsLoading] = useState<boolean>(!contextUser);
  const [error, setError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(contextUser?.name || "");
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const getAvatarSrc = useCallback(
    (avatarPath: string | null | undefined): string | null => {
      if (!avatarPath) return null;
      if (avatarPath.startsWith("http://") || avatarPath.startsWith("https://"))
        return avatarPath;
      return `${BACKEND_URL}${avatarPath}`;
    },
    []
  );

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setError("Authentication required.");
      setIsLoading(false);
      return;
    }
    if (!profileData) setIsLoading(true);
    setError(null);
    try {
      const data = await getCurrentUser();
      setProfileData(data);

      if (nameInput === (profileData?.name || "") || nameInput === "") {
        setNameInput(data.name || "");
      }

      if (!newAvatarFile) {
        setAvatarPreview(getAvatarSrc(data.avatarUrl));
      }

      const userForContext = {
        id: data.id,
        email: data.email,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
      };

      login(userForContext, token);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to load profile: ${err.message}`
          : "Unknown error."
      );
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  }, [token, login, getAvatarSrc, profileData, newAvatarFile, nameInput]);

  useEffect(() => {
    if (!profileData && token) fetchProfile();
    else if (!token) setIsLoading(false);

    if (profileData && !avatarPreview) {
      setAvatarPreview(getAvatarSrc(profileData.avatarUrl));
    }
  }, [profileData, token, fetchProfile, getAvatarSrc, avatarPreview]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) =>
    setNameInput(e.target.value);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setNewAvatarFile(null);
      setAvatarPreview(getAvatarSrc(profileData?.avatarUrl));
    }
  };

  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setProfileSuccess(null);
    setPasswordError(null);
    setPasswordSuccess(null);

    const nameChanged = nameInput !== (profileData?.name || "");
    const avatarChanged = newAvatarFile !== null;

    if (!nameChanged && !avatarChanged) {
      setError("No changes detected to save.");
      return;
    }

    setIsSavingProfile(true);

    const formData = new FormData();
    if (nameChanged) formData.append("name", nameInput);
    if (avatarChanged && newAvatarFile)
      formData.append("avatarImage", newAvatarFile);

    try {
      await updateUserProfile(formData);
      await fetchProfile();
      setProfileSuccess("Profile updated successfully!");
      setNewAvatarFile(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to update profile: ${err.message}`
          : "Unknown error."
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    setError(null);
    setProfileSuccess(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from the current password."
      );
      return;
    }

    setIsChangingPassword(true);

    try {
      const result = await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(result.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Unknown error changing password."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-4 text-center">
        <Alert
          message={
            error || "Could not load profile data. Please try logging in again."
          }
          type="error"
          title="Error!"
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

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">
            Your Profile
          </h1>

          {error && (
            <Alert
              message={error}
              type="error"
              title="Profile Update Error!"
              onClose={() => setError(null)}
              className="mb-4"
            />
          )}

          {profileSuccess && (
            <Alert
              message={profileSuccess}
              type="success"
              title="Success!"
              onClose={() => setProfileSuccess(null)}
              className="mb-4"
            />
          )}

          <form onSubmit={handleProfileUpdate} className="space-y-6 mt-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {avatarPreview ? (
                  <img
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-500"
                    src={avatarPreview}
                    alt="Avatar"
                  />
                ) : (
                  <span className="inline-block h-20 w-20 overflow-hidden rounded-full bg-gray-200 ring-2 ring-offset-2 ring-indigo-500">
                    <DefaultAvatar />
                  </span>
                )}
              </div>
              <div>
                <label
                  htmlFor="avatarImage"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Change Avatar:
                </label>
                <input
                  type="file"
                  id="avatarImage"
                  name="avatarImage"
                  accept="image/png, image/jpeg, image/gif"
                  onChange={handleFileChange}
                  disabled={isSavingProfile}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max 5MB (PNG, JPG, GIF)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email:
              </label>
              <p className="mt-1 text-sm text-gray-600 bg-gray-50 px-3 py-2 border border-gray-300 rounded-md">
                {profileData.email}
              </p>
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Name:
              </label>
              <input
                type="text"
                id="name"
                value={nameInput}
                onChange={handleNameChange}
                disabled={isSavingProfile}
                placeholder="Your Name"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={
                  isSavingProfile ||
                  (!newAvatarFile && nameInput === (profileData?.name || ""))
                }
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingProfile ? (
                  <>
                    <Spinner size="sm" color="text-white" className="mr-2" />
                    Saving Profile...
                  </>
                ) : (
                  "Save Profile Changes"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="p-6 sm:p-8 border-t border-gray-100">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Change Password
          </h3>

          {passwordError && (
            <Alert
              message={passwordError}
              type="error"
              title="Password Error!"
              onClose={() => setPasswordError(null)}
              className="mb-4"
            />
          )}

          {passwordSuccess && (
            <Alert
              message={passwordSuccess}
              type="success"
              title="Success!"
              onClose={() => setPasswordSuccess(null)}
              className="mb-4"
            />
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Current Password:
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPassword}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                New Password:
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={isChangingPassword}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 6 characters long.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmNewPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm New Password:
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={6}
                disabled={isChangingPassword}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? (
                  <>
                    <Spinner size="sm" color="text-white" className="mr-2" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
