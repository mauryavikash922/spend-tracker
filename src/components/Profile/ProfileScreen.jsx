import { CategoryManager } from '../Categories/CategoryPicker';

export function ProfileScreen({ user, onLogout, customCategories, onAddCategory, onRemoveCategory }) {
  return (
    <div className="flex flex-col bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-indigo-500 pt-8 pb-16 px-4 text-center relative">
        <h2 className="text-white font-bold text-lg mb-6">Profile</h2>
        <div className="flex flex-col items-center gap-3">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-20 h-20 rounded-full border-4 border-white shadow-lg" />
          ) : (
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-3xl border-4 border-white shadow-lg">
              {user?.name?.[0]}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-xl">{user?.name}</p>
            <p className="text-indigo-200 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 space-y-4">

        {/* Account card */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <i className="ri-account-circle-line text-indigo-500" />Account
          </h3>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <i className="ri-user-line text-gray-400" />Name
            </span>
            <span className="font-medium text-gray-900">{user?.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <i className="ri-mail-line text-gray-400" />Email
            </span>
            <span className="font-medium text-gray-900 text-xs">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <i className="ri-google-line text-gray-400" />Storage
            </span>
            <span className="font-medium text-gray-900 text-xs">Your Google Drive</span>
          </div>
        </div>

        {/* Custom Categories */}
        <div className="card">
          <CategoryManager
            customCategories={customCategories}
            onAdd={onAddCategory}
            onRemove={onRemoveCategory}
          />
        </div>

        {/* App info */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <i className="ri-information-line text-indigo-500" />About
          </h3>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <i className="ri-apps-line text-gray-400" />App
            </span>
            <span className="font-medium text-gray-900">SpendWise</span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50 text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <i className="ri-database-2-line text-gray-400" />Data stored in
            </span>
            <span className="font-medium text-gray-900 text-xs">My Spends - {new Date().getFullYear()}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 font-semibold py-4 rounded-2xl border border-red-100 active:scale-95 transition-all"
        >
          <i className="ri-logout-box-r-line text-lg" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
