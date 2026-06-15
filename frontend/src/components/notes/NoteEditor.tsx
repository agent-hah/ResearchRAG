import { useState, useEffect } from 'react'
import { Save, X, Tag } from 'lucide-react'
import { notesService } from '../../services/notesService'
import { RichTextEditor } from '../common/RichTextEditor'

interface NoteEditorProps {
  initialTitle?: string
  initialContent?: string
  initialTags?: string[]
  onSave: (title: string, content: string, tags: string[]) => void
  onCancel: () => void
  isLoading?: boolean
}

export function NoteEditor({
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  onSave,
  onCancel,
  isLoading = false
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [tags, setTags] = useState<string[]>(initialTags)
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  const filteredTags = availableTags.filter(tag => 
    tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
  )

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await notesService.getTags()
        setAvailableTags(tags)
      } catch (error) {
        console.error('Failed to fetch tags:', error)
      }
    }
    fetchTags()
  }, [])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSave = () => {
    if (content.trim()) {
      onSave(title.trim() || 'Untitled Note', content.trim(), tags)
    }
  }

  return (
    <div className="space-y-4">
      {/* Title Editor */}
      <div>
        <label htmlFor="note-title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoading}
        />
      </div>

      {/* Content Editor */}
      <div>
        <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-2">
          Note Content
        </label>
        <RichTextEditor
          initialContent={content}
          onChange={setContent}
          placeholder="Write your note here..."
          disabled={isLoading}
          minHeight="200px"
        />
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tag-input" className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          Tags
        </label>
        <div className="flex gap-2 mb-2 relative">
          <div className="flex-1 relative">
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value)
                setShowTagSuggestions(true)
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => {
                // Short delay to allow click on suggestion to register before hiding
                setTimeout(() => setShowTagSuggestions(false), 200)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Add a tag..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
              autoComplete="off"
            />
            {showTagSuggestions && filteredTags.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {filteredTags.map((tag) => (
                  <li
                    key={tag}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      if (!tags.includes(tag)) {
                        setTags([...tags, tag])
                      }
                      setTagInput('')
                      setShowTagSuggestions(false)
                    }}
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim() || isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isLoading}
                  className="hover:text-primary-900 disabled:opacity-50"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim() || isLoading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Note'}
        </button>
      </div>
    </div>
  )
}
