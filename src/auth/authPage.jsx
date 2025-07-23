import React from "react";

const AuthPage = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-purple-600 to-indigo-700 items-center justify-center p-10 text-white">
        <div>
          <h1 className="text-4xl font-bold mb-4">Welcome to Xami</h1>
          <p className="text-lg max-w-md">
            Track, manage and automate your workflow with ease. Let's get you started!
          </p>
        </div>
      </div>

      {/* Right Panel (Form) */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-100 p-4 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.001 9.001 0 1117.803 5.122a9.001 9.001 0 01-12.682 12.682z" />
              </svg>
            </div>
          </div>

          <h2 className="text-center text-2xl font-semibold text-gray-800">Create Account</h2>
          <p className="text-center text-sm text-gray-500 mb-6">Join us and start your journey today</p>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" placeholder="Enter your full name" className="w-full border border-gray-300 rounded px-4 py-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input type="email" placeholder="Enter your email" className="w-full border border-gray-300 rounded px-4 py-2 mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="password" placeholder="Create a strong password" className="w-full border border-gray-300 rounded px-4 py-2 mt-1" />
            </div>

            <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2 rounded mt-4 hover:opacity-90">Create Account</button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account? <a href="/login" className="text-purple-600 hover:underline">Sign In</a>
            </p>

            <div className="flex items-center justify-center space-x-4 mt-4">
              <button type="button" className="flex-1 border px-4 py-2 rounded flex items-center justify-center">
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 mr-2" />
                Google
              </button>
              <button type="button" className="flex-1 border px-4 py-2 rounded flex items-center justify-center">
                <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" alt="Facebook" className="w-5 h-5 mr-2" />
                Facebook
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
