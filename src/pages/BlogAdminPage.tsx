import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileText, 
  CheckCircle, 
  Clock,
  ArrowLeft,
  Save,
  X
} from 'lucide-react';
import type { BlogPost } from '@/types/blog';

const ADMIN_EMAIL = 'adamhsly@googlemail.com';

const BlogAdminPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content_markdown: '',
    featured_image_url: '',
    author_name: 'Frags & Fortunes Team',
    category: '',
    tags: '',
    seo_title: '',
    seo_description: '',
    is_published: false,
  });

  // Check authorization
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, authLoading, navigate, toast]);

  // Fetch posts
  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load blog posts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content_markdown: '',
      featured_image_url: '',
      author_name: 'Frags & Fortunes Team',
      category: '',
      tags: '',
      seo_title: '',
      seo_description: '',
      is_published: false,
    });
    setEditingPost(null);
    setIsCreating(false);
  };

  const startEditing = (post: BlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || '',
      content_markdown: post.content_markdown,
      featured_image_url: post.featured_image_url || '',
      author_name: post.author_name || 'Frags & Fortunes Team',
      category: post.category || '',
      tags: post.tags?.join(', ') || '',
      seo_title: post.seo_title || '',
      seo_description: post.seo_description || '',
      is_published: post.is_published,
    });
    setActiveTab('editor');
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
    setActiveTab('editor');
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.content_markdown) {
      toast({
        title: 'Validation Error',
        description: 'Title, slug, and content are required.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const postData = {
        title: formData.title,
        slug: formData.slug,
        excerpt: formData.excerpt || null,
        content_markdown: formData.content_markdown,
        featured_image_url: formData.featured_image_url || null,
        author_name: formData.author_name || 'Frags & Fortunes Team',
        category: formData.category || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Post updated successfully.' });
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert(postData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Post created successfully.' });
      }

      await fetchPosts();
      resetForm();
      setActiveTab('posts');
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save post.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePostId) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', deletePostId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Post deleted successfully.' });
      await fetchPosts();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete post.',
        variant: 'destructive',
      });
    } finally {
      setDeletePostId(null);
    }
  };

  const togglePublished = async (post: BlogPost) => {
    try {
      const newPublishedState = !post.is_published;
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_published: newPublishedState,
          published_at: newPublishedState ? new Date().toISOString() : null,
        })
        .eq('id', post.id);

      if (error) throw error;
      toast({
        title: 'Success',
        description: `Post ${newPublishedState ? 'published' : 'unpublished'} successfully.`,
      });
      await fetchPosts();
    } catch (error: any) {
      console.error('Error toggling publish:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update post.',
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Not authorized
  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  const publishedCount = posts.filter(p => p.is_published).length;
  const draftCount = posts.filter(p => !p.is_published).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0F14] to-[#12161C]">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Blog Admin
          </h1>
          <p className="text-gray-400">Manage your blog posts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <FileText className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{posts.length}</p>
                <p className="text-sm text-gray-400">Total Posts</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{publishedCount}</p>
                <p className="text-sm text-gray-400">Published</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{draftCount}</p>
                <p className="text-sm text-gray-400">Drafts</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-[#1a1f2e]">
              <TabsTrigger value="posts">All Posts</TabsTrigger>
              <TabsTrigger value="editor">
                {editingPost ? 'Edit Post' : isCreating ? 'New Post' : 'Editor'}
              </TabsTrigger>
            </TabsList>

            {activeTab === 'posts' && (
              <Button onClick={startCreating} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Post
              </Button>
            )}
          </div>

          {/* Posts List */}
          <TabsContent value="posts" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : posts.length === 0 ? (
              <Card className="bg-[#1a1f2e] border-gray-700">
                <CardContent className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No blog posts yet</p>
                  <Button onClick={startCreating} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Card key={post.id} className="bg-[#1a1f2e] border-gray-700 hover:border-purple-500/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium truncate">{post.title}</h3>
                            <Badge 
                              variant={post.is_published ? 'default' : 'secondary'}
                              className={post.is_published ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
                            >
                              {post.is_published ? 'Published' : 'Draft'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            /{post.slug} • {post.category || 'Uncategorized'} • {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/blog/${post.slug}`, '_blank')}
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(post)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletePostId(post.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={post.is_published}
                            onCheckedChange={() => togglePublished(post)}
                            title={post.is_published ? 'Unpublish' : 'Publish'}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Editor */}
          <TabsContent value="editor">
            {!editingPost && !isCreating ? (
              <Card className="bg-[#1a1f2e] border-gray-700">
                <CardContent className="p-12 text-center">
                  <Edit className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">Select a post to edit or create a new one</p>
                  <Button onClick={startCreating} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-[#1a1f2e] border-gray-700">
                <CardHeader className="border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">
                      {editingPost ? 'Edit Post' : 'Create New Post'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-white">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Enter post title"
                      className="bg-[#0f1319] border-gray-600 text-white"
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="slug" className="text-white">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="post-url-slug"
                      className="bg-[#0f1319] border-gray-600 text-white"
                    />
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <Label htmlFor="excerpt" className="text-white">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      value={formData.excerpt}
                      onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                      placeholder="Brief description of the post"
                      rows={2}
                      className="bg-[#0f1319] border-gray-600 text-white"
                    />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-white">Content (Markdown) *</Label>
                    <Textarea
                      id="content"
                      value={formData.content_markdown}
                      onChange={(e) => setFormData(prev => ({ ...prev, content_markdown: e.target.value }))}
                      placeholder="Write your post content in Markdown..."
                      rows={15}
                      className="bg-[#0f1319] border-gray-600 text-white font-mono text-sm"
                    />
                  </div>

                  {/* Featured Image URL */}
                  <div className="space-y-2">
                    <Label htmlFor="featured_image" className="text-white">Featured Image URL</Label>
                    <Input
                      id="featured_image"
                      value={formData.featured_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured_image_url: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      className="bg-[#0f1319] border-gray-600 text-white"
                    />
                  </div>

                  {/* Author & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="author" className="text-white">Author</Label>
                      <Input
                        id="author"
                        value={formData.author_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, author_name: e.target.value }))}
                        placeholder="Author name"
                        className="bg-[#0f1319] border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-white">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., Strategy, News, Guide"
                        className="bg-[#0f1319] border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="text-white">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="cs2, valorant, fantasy"
                      className="bg-[#0f1319] border-gray-600 text-white"
                    />
                  </div>

                  {/* SEO Fields */}
                  <div className="space-y-4 border-t border-gray-700 pt-6">
                    <h3 className="text-white font-medium">SEO Settings</h3>
                    <div className="space-y-2">
                      <Label htmlFor="seo_title" className="text-white">SEO Title</Label>
                      <Input
                        id="seo_title"
                        value={formData.seo_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, seo_title: e.target.value }))}
                        placeholder="Custom title for search engines"
                        className="bg-[#0f1319] border-gray-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seo_description" className="text-white">SEO Description</Label>
                      <Textarea
                        id="seo_description"
                        value={formData.seo_description}
                        onChange={(e) => setFormData(prev => ({ ...prev, seo_description: e.target.value }))}
                        placeholder="Meta description for search engines (max 160 characters)"
                        rows={2}
                        className="bg-[#0f1319] border-gray-600 text-white"
                      />
                    </div>
                  </div>

                  {/* Publish Toggle */}
                  <div className="flex items-center justify-between border-t border-gray-700 pt-6">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="is_published"
                        checked={formData.is_published}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                      />
                      <Label htmlFor="is_published" className="text-white cursor-pointer">
                        Publish immediately
                      </Label>
                    </div>

                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {editingPost ? 'Update Post' : 'Create Post'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent className="bg-[#1a1f2e] border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogAdminPage;
