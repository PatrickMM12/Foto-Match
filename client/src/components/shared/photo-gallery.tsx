import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface PhotoGalleryImage {
  id: number;
  url: string;
  title: string;
  category: string;
}

interface PhotoGalleryProps {
  images: PhotoGalleryImage[];
  columns?: number;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  images, 
  columns = 3 
}) => {
  const [selectedImage, setSelectedImage] = useState<PhotoGalleryImage | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  if (!images || images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma imagem disponível.</p>
      </div>
    );
  }
  
  // Get unique categories from images
  const categories = Array.from(new Set(images.map(img => img.category).filter(Boolean)));
  
  // Filter images by category
  const filteredImages = categoryFilter 
    ? images.filter(img => img.category === categoryFilter)
    : images;
  
  // Navigate to the next image in lightbox
  const navigateToNextImage = () => {
    if (!selectedImage) return;
    
    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    const nextIndex = (currentIndex + 1) % filteredImages.length;
    setSelectedImage(filteredImages[nextIndex]);
  };
  
  // Navigate to the previous image in lightbox
  const navigateToPrevImage = () => {
    if (!selectedImage) return;
    
    const currentIndex = filteredImages.findIndex(img => img.id === selectedImage.id);
    const prevIndex = (currentIndex - 1 + filteredImages.length) % filteredImages.length;
    setSelectedImage(filteredImages[prevIndex]);
  };
  
  // Open the lightbox with selected image
  const openLightbox = (image: PhotoGalleryImage) => {
    setSelectedImage(image);
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={categoryFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(null)}
          >
            Todas
          </Button>
          
          {categories.map(category => (
            <Button
              key={category}
              variant={categoryFilter === category ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      )}
      
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${columns} gap-4`}>
        {filteredImages.map((image) => (
          <div 
            key={image.id} 
            className="group relative overflow-hidden rounded-md cursor-pointer bg-gray-100"
            onClick={() => openLightbox(image)}
          >
            <div className="aspect-square overflow-hidden">
              <img 
                src={image.url} 
                alt={image.title || 'Gallery Image'} 
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
              <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            
            {(image.title || image.category) && (
              <div className="absolute left-0 right-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {image.title && (
                  <h3 className="font-medium text-sm truncate">{image.title}</h3>
                )}
                {image.category && (
                  <p className="text-xs text-gray-200">{image.category}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black/90 border-none">
          <div className="relative h-[80vh] flex flex-col">
            {/* Close button */}
            <button 
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Navigation buttons */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigateToPrevImage();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                navigateToNextImage();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            
            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-4">
              {selectedImage && (
                <img 
                  src={selectedImage.url} 
                  alt={selectedImage.title || 'Gallery Image'} 
                  className="max-h-full max-w-full object-contain"
                />
              )}
            </div>
            
            {/* Caption */}
            {selectedImage && (selectedImage.title || selectedImage.category) && (
              <div className="p-4 bg-black text-white">
                {selectedImage.title && (
                  <DialogTitle className="text-lg font-medium">{selectedImage.title}</DialogTitle>
                )}
                {selectedImage.category && (
                  <DialogDescription className="text-sm text-gray-400">{selectedImage.category}</DialogDescription>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PhotoGallery;
