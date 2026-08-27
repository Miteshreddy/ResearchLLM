# Obsidian Markdown Conventions

Obsidian is a knowledge management application that uses plain Markdown files with additional features for linking and organizing information.

## File Structure

### YAML Frontmatter
Every note should start with YAML frontmatter:
```yaml
---
title: Note Title
type: note
tags:
  - tag1
  - tag2
date: 2024-01-15
---
```

### Headings
Use standard Markdown headings for structure:
```markdown
# Main Title (H1 - one per note)
## Section
### Subsection
```

## Linking

### Wiki Links
Obsidian uses double-bracket wiki links:
- `[[Note Title]]` - Link to another note
- `[[Note Title|Display Text]]` - Link with custom display text
- `[[Note Title#Section]]` - Link to a specific section

### Tags
Use tags for categorization:
- Inline: `#tag-name`
- In frontmatter: under `tags:` field

## Best Practices

1. **Atomic notes**: Each note should cover one concept
2. **Meaningful titles**: Use descriptive, searchable titles
3. **Bidirectional linking**: Link related notes to each other
4. **Consistent tagging**: Use a controlled vocabulary for tags
5. **Folder organization**: Group related notes in folders
6. **Templates**: Use consistent structure within note types

## Vault Structure
```
Vault/
├── Index.md
├── Research/
├── Topics/
├── Sources/
├── Claims/
└── Templates/
```
