import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Save, Eye, Trash2, Copy, Star } from "lucide-react";
import { toast } from "sonner";

const categories = ["New Lead", "Follow-up", "Offer", "Closing", "General"];

export default function EmailTemplateBuilder() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("list"); // list, create, edit
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    template_name: "",
    subject: "",
    html_content: "<h1>Email Title</h1><p>Your email content here...</p>",
    preview_text: "",
    category: "General",
  });
  const [showPreview, setShowPreview] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: () => base44.entities.EmailTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Template saved!");
      resetForm();
    },
    onError: () => toast.error("Failed to save template"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.EmailTemplate.update(editingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Template updated!");
      resetForm();
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
      toast.success("Template deleted!");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const favoriteMutation = useMutation({
    mutationFn: (id) => {
      const template = templates.find(t => t.id === id);
      return base44.entities.EmailTemplate.update(id, { is_favorite: !template.is_favorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailTemplates"] });
    },
  });

  const resetForm = () => {
    setFormData({
      template_name: "",
      subject: "",
      html_content: "<h1>Email Title</h1><p>Your email content here...</p>",
      preview_text: "",
      category: "General",
    });
    setEditingId(null);
    setMode("list");
  };

  const handleSave = () => {
    if (!formData.template_name || !formData.subject) {
      toast.error("Please fill in template name and subject");
      return;
    }

    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template) => {
    setFormData(template);
    setEditingId(template.id);
    setMode("edit");
  };

  const handleDuplicate = (template) => {
    setFormData({
      ...template,
      template_name: `${template.template_name} (Copy)`,
    });
    setEditingId(null);
    setMode("create");
  };

  if (mode === "create" || mode === "edit") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{editingId ? "Edit" : "Create"} Email Template</h2>
          <Button variant="outline" onClick={resetForm}>Cancel</Button>
        </div>

        <Tabs defaultValue="editor" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="editor" className="flex-1">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    placeholder="e.g., Welcome Email"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <Label>Preview Text</Label>
                  <Input
                    value={formData.preview_text}
                    onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                    placeholder="Text shown before opening email"
                  />
                </div>

                <div>
                  <Label>Email Content (HTML)</Label>
                  <Textarea
                    value={formData.html_content}
                    onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                    placeholder="Enter HTML content"
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Tip: Use {`{{property_address}}`}, {`{{owner_name}}`}, {`{{deal_score}}`} for dynamic fields
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                  <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? "Hide" : "Show"} Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardContent className="pt-6">
                <div className="bg-slate-100 rounded-lg p-4 space-y-3">
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-slate-500 mb-1">Subject:</p>
                    <p className="font-medium text-slate-900">{formData.subject || "(No subject)"}</p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <p className="text-xs text-slate-500 mb-1">Preview:</p>
                    <p className="text-sm text-slate-600">{formData.preview_text || "(No preview text)"}</p>
                  </div>
                  <div className="bg-white rounded p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formData.html_content }} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Email Templates
        </h2>
        <Button onClick={() => { setMode("create"); setEditingId(null); }}>
          + New Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <Card className="text-center py-12">
            <Mail className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No templates yet. Create your first email template!</p>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{template.template_name}</h3>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        {template.category}
                      </span>
                      {template.is_favorite && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">Subject: {template.subject}</p>
                    <p className="text-xs text-slate-500">
                      Used {template.usage_count} times
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => favoriteMutation.mutate(template.id)}
                    >
                      <Star className={`w-4 h-4 ${template.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(template)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(template.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}