import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Star, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProductImage {
  id?: string;
  file?: File;
  preview: string;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
  uploaded?: boolean;
}

interface MultipleImageUploadProps {
  productId?: string;
  onImagesChange: (images: ProductImage[]) => void;
  existingImages?: ProductImage[];
}

const MultipleImageUpload = ({ productId, onImagesChange, existingImages = [] }: MultipleImageUploadProps) => {
  const [images, setImages] = useState<ProductImage[]>(existingImages);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File, order: number): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId || 'temp'}_${order}_${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        toast({
          title: "Upload Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      return filePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleFileSelect = useCallback((files: FileList) => {
    const newImages: ProductImage[] = [];
    
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        newImages.push({
          file,
          preview,
          alt_text: file.name.split('.')[0],
          display_order: images.length + index,
          is_primary: images.length === 0 && index === 0, // First image is primary if no existing images
        });
      }
    });

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    // Reorder display_order
    const reorderedImages = updatedImages.map((img, i) => ({
      ...img,
      display_order: i,
      // If we removed the primary image, make the first one primary
      is_primary: img.is_primary ? true : (i === 0 && !updatedImages.some(img => img.is_primary))
    }));
    
    setImages(reorderedImages);
    onImagesChange(reorderedImages);
  }, [images, onImagesChange]);

  const updateAltText = useCallback((index: number, altText: string) => {
    const updatedImages = images.map((img, i) => 
      i === index ? { ...img, alt_text: altText } : img
    );
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const setPrimary = useCallback((index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const moveImage = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;

    const updatedImages = [...images];
    [updatedImages[index], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[index]];
    
    // Update display_order
    updatedImages.forEach((img, i) => {
      img.display_order = i;
    });
    
    setImages(updatedImages);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const uploadAllImages = async (): Promise<boolean> => {
    if (!productId) return false;

    try {
      const uploadPromises = images.map(async (image, index) => {
        if (image.file && !image.uploaded) {
          const uploadedPath = await uploadImage(image.file, index);
          if (uploadedPath) {
            // Save to product_images table
            const { error } = await supabase
              .from('product_images')
              .insert({
                product_id: productId,
                image_url: uploadedPath,
                alt_text: image.alt_text,
                display_order: image.display_order,
                is_primary: image.is_primary,
              });

            if (error) {
              console.error('Error saving image to database:', error);
              return false;
            }
            return true;
          }
        }
        return true; // Already uploaded or no file
      });

      const results = await Promise.all(uploadPromises);
      return results.every(result => result);
    } catch (error) {
      console.error('Error uploading images:', error);
      return false;
    }
  };

  return (
    <div className="space-y-4">
      <Label>Product Images</Label>
      
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Drag and drop images here, or{' '}
            <label className="text-primary hover:text-primary/80 cursor-pointer underline">
              browse files
              <Input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports JPG, PNG, WebP. Multiple images allowed.
          </p>
        </div>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image, index) => (
            <Card key={index} className={`relative ${image.is_primary ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="aspect-video relative bg-muted rounded-lg overflow-hidden mb-3">
                  <img
                    src={image.preview}
                    alt={image.alt_text}
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  {image.is_primary && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Primary
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Input
                    placeholder="Alt text / description"
                    value={image.alt_text}
                    onChange={(e) => updateAltText(index, e.target.value)}
                    className="text-sm"
                  />
                  
                  <div className="flex gap-2">
                    {!image.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimary(index)}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => moveImage(index, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={index === images.length - 1}
                        onClick={() => moveImage(index, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { MultipleImageUpload, type ProductImage };

export default MultipleImageUpload;