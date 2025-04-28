import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge'; // Use Badge for tag display

interface TagInputProps {
  value: string[]; // Array of tags
  onChange: (tags: string[]) => void; // Callback when tags change
  placeholder?: string;
  id?: string;
  maxTags?: number;
}

const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Adicione tags...',
  id,
  maxTags,
}) => {
  const [inputValue, setInputValue] = useState<string>('');

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const newTag = inputValue.trim();

    // Add tag on Enter or Comma
    if ((event.key === 'Enter' || event.key === ',') && newTag) {
      event.preventDefault(); // Prevent form submission on Enter
      if ((!maxTags || value.length < maxTags) && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue(''); // Clear input
    }
    // Remove last tag on Backspace if input is empty
    else if (event.key === 'Backspace' && !inputValue && value.length > 0) {
      event.preventDefault();
      const newTags = value.slice(0, -1);
      onChange(newTags);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = value.filter(tag => tag !== tagToRemove);
    onChange(newTags);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center rounded-md border border-input bg-background p-2">
      {value.map((tag, index) => (
        <Badge key={index} variant="secondary" className="flex items-center gap-1 whitespace-nowrap">
          {tag}
          <button
            type="button" // Prevent form submission
            onClick={() => removeTag(tag)}
            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label={`Remover ${tag}`}
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </Badge>
      ))}
      <Input
        id={id}
        type="text"
        placeholder={(!maxTags || value.length < maxTags) ? placeholder : `Máximo de ${maxTags} tags atingido`}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className="flex-1 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto py-1 px-2 min-w-[80px]"
        disabled={!!(maxTags && value.length >= maxTags)}
      />
    </div>
  );
};

export default TagInput; 