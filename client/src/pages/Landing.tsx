import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to Doliver
          </CardTitle>
          <CardDescription className="text-gray-600">
            Investment lifecycle management platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-6">
              Sign in to access your deals, documents, and portfolio analytics
            </p>
            <Button 
              onClick={handleLogin}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              Sign In with Replit
            </Button>
          </div>
          
          <div className="border-t pt-6">
            <div className="grid grid-cols-2 gap-4 text-center text-sm text-gray-500">
              <div>
                <div className="font-medium">Deal Tracking</div>
                <div>Manage your investment pipeline</div>
              </div>
              <div>
                <div className="font-medium">AI Analysis</div>
                <div>Intelligent document insights</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}