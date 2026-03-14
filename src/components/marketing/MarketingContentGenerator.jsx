import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Download,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export default function MarketingContentGenerator({ leadId, lead }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState({});

  const { data: socialPosts, refetch: refetchSocial } = useQuery({
    queryKey: ["socialPosts", leadId],
    queryFn: async () => {
      const response = await base44.functions.invoke("generateSocialPosts", {
        lead_id: leadId,
      });
      return response.data;
    },
    enabled: false,
  });

  const flyerMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("generateMarketingFlyer", {
        lead_id: leadId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Flyer generated!");
      // Trigger download
      const link = document.createElement("a");
      link.href = data.pdf_data;
      link.download = data.filename;
      link.click();
    },
    onError: () => toast.error("Failed to generate flyer"),
  });

  const socialMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke("generateSocialPosts", {
        lead_id: leadId,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success("Posts generated!");
      refetchSocial();
    },
    onError: () => toast.error("Failed to generate posts"),
  });

  const handleCopyPost = (platform, text) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [platform]: true });
    setTimeout(() => setCopied({ ...copied, [platform]: false }), 2000);
    toast.success(`${platform} post copied!`);
  };

  const handleSharePost = (platform, text) => {
    const shareUrls = {
      instagram: `https://www.instagram.com/`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
    };

    if (platform === "instagram") {
      toast.info("Copy the post and share it on Instagram");
      handleCopyPost(platform, text);
    } else {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
  };

  const socialIcons = {
    instagram: Instagram,
    facebook: Facebook,
    twitter: Twitter,
    linkedin: Linkedin,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Marketing Content
        </CardTitle>
        <p className="text-sm text-slate-600 mt-2">
          Generate professional flyers and social media posts automatically
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={() => flyerMutation.mutate()}
            disabled={flyerMutation.isPending}
            variant="outline"
            className="flex-1 gap-2"
          >
            {flyerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Flyer
              </>
            )}
          </Button>

          <Button
            onClick={() => socialMutation.mutate()}
            disabled={socialMutation.isPending || socialPosts}
            variant="outline"
            className="flex-1 gap-2"
          >
            {socialMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Generate Posts
              </>
            )}
          </Button>
        </div>

        {/* Social Media Posts */}
        {socialPosts && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-slate-900 mb-3">Social Media Posts</p>
            <Tabs defaultValue="instagram" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                {Object.entries(socialIcons).map(([platform, PlatformIcon]) => (
                  <TabsTrigger key={platform} value={platform} className="flex gap-1">
                    <PlatformIcon className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">{platform}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(socialPosts.posts || {}).map(([platform, text]) => (
                <TabsContent key={platform} value={platform} className="mt-4">
                  <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyPost(platform, text)}
                        className="flex-1 gap-2"
                      >
                        {copied[platform] ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSharePost(platform, text)}
                        className="flex-1 gap-2"
                      >
                        <Share2 className="w-3 h-3" />
                        Share
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}