import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_ENDPOINTS, type ApiEndpoint } from "@/lib/api";

interface ApiConfigProps {
  currentUrl: string;
  onUrlChange: (url: string) => void;
}

export function ApiConfig({ currentUrl, onUrlChange }: ApiConfigProps) {
  const [customUrl, setCustomUrl] = useState(currentUrl);
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetChange = (preset: ApiEndpoint) => {
    const url = API_ENDPOINTS[preset];
    setCustomUrl(url);
    onUrlChange(url);
  };

  const handleCustomUrlSubmit = () => {
    onUrlChange(customUrl);
    setIsOpen(false);
  };

  const getCurrentPreset = (): ApiEndpoint | "custom" => {
    const preset = Object.entries(API_ENDPOINTS).find(([_, url]) => url === currentUrl);
    return preset ? (preset[0] as ApiEndpoint) : "custom";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="mr-2 h-4 w-4" />
          API Config
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Configuration</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preset">Preset Endpoints</Label>
            <Select
              value={getCurrentPreset()}
              onValueChange={(value) => {
                if (value !== "custom") {
                  handlePresetChange(value as ApiEndpoint);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fastapi">FastAPI Backend (Recommended)</SelectItem>
                <SelectItem value="local">Local FastAPI</SelectItem>
                <SelectItem value="demo">Demo API (JSONPlaceholder)</SelectItem>
                <SelectItem value="custom">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customUrl">Custom API URL</Label>
            <Input
              id="customUrl"
              placeholder="https://api.example.com/data"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCustomUrlSubmit}>
              Apply
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>FastAPI Backend:</strong> Full-featured API with column selection (http://localhost:8000)</p>
            <p><strong>Local FastAPI:</strong> Same as above, for local development</p>
            <p><strong>Demo:</strong> Uses JSONPlaceholder for demonstration (limited features)</p>
            <p><strong>Custom:</strong> Use any REST API that returns JSON arrays</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}