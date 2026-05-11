import React from 'react';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-center text-2xl font-bold text-primary dark:text-gray-100">
            تسجيل الدخول
          </h2>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            قم بالدخول إلى حسابك لإدارة المهام والمشاريع
          </p>
        </div>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="البريد الإلكتروني"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-100 mb-1">
                كلمة المرور
              </label>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="كلمة المرور"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                تذكرني
              </label>
            </div>
            
            <div className="text-sm">
              <a href="#" className="font-medium text-primary hover:underline dark:text-gray-200">
                نسيت كلمة المرور؟
              </a>
            </div>
          </div>
          
          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              تسجيل الدخول
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 focus-visible:opacity-20"></div>
            </button>
          </div>
          
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            لا تملك حساب؟{' '}
            <a href="/register" className="font-medium text-primary hover:underline dark:text-gray-200">
              إنشاء حساب
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;