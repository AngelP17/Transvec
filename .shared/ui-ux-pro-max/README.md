# UI/UX Pro Max Local Search

This folder provides a local, editable knowledge base for the `search.py` helper used by the `ui-ux-pro-max` skill.

## Files

- `/Users/apinzon/Desktop/Active Projects/Transvec/.shared/ui-ux-pro-max/scripts/search.py`
- `/Users/apinzon/Desktop/Active Projects/Transvec/.shared/ui-ux-pro-max/data/knowledge_base.json`

## Usage

```bash
python3 .shared/ui-ux-pro-max/scripts/search.py "mobile dashboard operations" --domain product
python3 .shared/ui-ux-pro-max/scripts/search.py "responsive layout" --stack react
python3 .shared/ui-ux-pro-max/scripts/search.py "touch targets" --domain ux --top 5
```

## JSON Schema

`knowledge_base.json` must include two top-level objects:

```json
{
  "domains": {
    "<domain-name>": [Entry, Entry]
  },
  "stacks": {
    "<stack-name>": [Entry, Entry]
  }
}
```

Each `Entry` must be:

```json
{
  "title": "Human readable title",
  "tags": ["keyword1", "keyword2"],
  "bullets": [
    "Guideline line 1.",
    "Guideline line 2."
  ]
}
```

## Rules

- `title` must be a non-empty string.
- `tags` must be a non-empty array of non-empty strings.
- `bullets` must be a non-empty array of non-empty strings.
- Domain and stack names are dynamic and read from JSON (no code changes required).

## Editing Tips

- Keep tags lowercase for better matching.
- Use short, action-oriented bullets.
- Add focused entries instead of very broad ones.
- Prefer adding a new entry over making one entry too long.

## Troubleshooting

- If JSON is malformed or missing required keys, `search.py` exits with an error message.
- If `--domain` or `--stack` is invalid, CLI output will show valid values.

