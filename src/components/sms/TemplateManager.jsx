import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Star,
  Copy,
  Search
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const CATEGORIES = [
  "New Lead Intro",
  "Follow-up Request",
  "Meeting Confirmation",
  "Offer Discussion",
  "Contract Sent",
  "Closing Update",
  "General"
];

const categoryColors = {
  "New Lead Intro": "bg-blue-100 text-blue-700",
  "Follow-up Request": "bg-amber-100 text-amber-700",
  "Meeting Confirmation": "bg-green-100 text-green-700",
  "Offer Discussion": "bg-purple-100 text-purple-700",
  "Contract Sent": "bg-indigo-100 text-indigo-700",
  "Closing Update": "bg-teal-100 text-teal-700",
  "General": "bg-slate-100 text-slate-700"
};

export default function TemplateManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [formData, setFormData] = useState({
    template_name: "",
    category: "General",
    message_text: "",
    is_favorite: false
  });

  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: () => base44.entities.SMSTemplate.list('-updated_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SMSTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SMSTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SMSTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) => 
      base44.entities.SMSTemplate.update(id, { is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    }
  });

  const resetForm = () => {
    setFormData({
      template_name: "",
      category: "General",
      message_text: "",
      is_favorite: false
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      category: template.category,
      message_text: template.message_text,
      is_favorite: template.is_favorite || false
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.message_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || template.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const favoriteTemplates = filteredTemplates.filter(t => t.is_favorite);
  const regularTemplates = filteredTemplates.filter(t => !t.is_favorite);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Templates
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {templates.length} template{templates.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-slate-900">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 h-10 rounded-xl">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {favoriteTemplates.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            Favorites
          </h3>
          <div className="grid gap-3">
            {favoriteTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={deleteMutation.mutate}
                onToggleFavorite={toggleFavoriteMutation.mutate}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </div>
      )}

      {regularTemplates.length > 0 && (
        <div>
          {favoriteTemplates.length > 0 && (
            <h3 className="text-sm font-semibold text-slate-700 mb-2">All Templates</h3>
          )}
          <div className="grid gap-3">
            {regularTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={deleteMutation.mutate}
                onToggleFavorite={toggleFavoriteMutation.mutate}
                onCopy={handleCopy}
              />
            ))}
          </div>
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500">
            {searchQuery || filterCategory !== "all" ? "No templates found" : "No templates created yet"}
          </p>
        </div>
      )}

      <Sheet open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <SheetContent side="bottom" className="rounded-t-3xl h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingTemplate ? "Edit Template" : "New Template"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label className="text-slate-700">Template Name</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., First Contact Message"
                className="mt-1.5 h-11 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-slate-700">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700">Message Text</Label>
              <Textarea
                value={formData.message_text}
                onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                placeholder="Hi {owner_name}, I noticed your property at {property_address}..."
                className="mt-1.5 rounded-xl min-h-32"
                rows={6}
              />
              <p className="text-xs text-slate-500 mt-2">
                Use placeholders: {"{property_address}"}, {"{owner_name}"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_favorite}
                onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <Label className="text-slate-700">Mark as favorite</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={resetForm}
                className="flex-1 h-11 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.template_name || !formData.message_text}
                className="flex-1 h-11 rounded-xl bg-slate-900"
              >
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TemplateCard({ template, onEdit, onDelete, onToggleFavorite, onCopy }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleFavorite({ id: template.id, is_favorite: !template.is_favorite })}
          className="mt-1"
        >
          <Star className={`w-5 h-5 ${template.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
              <Badge className={`mt-1 ${categoryColors[template.category]}`}>
                {template.category}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
            {template.message_text}
          </p>
          {template.usage_count > 0 && (
            <p className="text-xs text-slate-500">Used {template.usage_count} times</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(template.message_text)}
            className="h-8 w-8"
            title="Copy"
          >
            <Copy className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(template)}
            className="h-8 w-8"
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('Delete this template?')) {
                onDelete(template.id);
              }
            }}
            className="h-8 w-8"
            title="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </div>
    </Card>
  );
}