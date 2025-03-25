# Memory Bank Maintenance Guide

## Quick Reference

### When to Update
✅ After implementing significant features
✅ When discovering new patterns
✅ When explicitly requested ("update memory bank")
✅ When context needs clarification

### Update Checklist

1. **Daily Updates**
   ```
   [ ] Update activeContext.md with current focus
   [ ] Record any new decisions made
   [ ] Update progress.md with completed items
   [ ] Add new known issues
   ```

2. **Feature Implementation**
   ```
   [ ] Update progress.md
   [ ] Add new patterns to systemPatterns.md
   [ ] Update technical details in techContext.md
   [ ] Record learnings in .cursorrules
   ```

3. **Full Review ("update memory bank")**
   ```
   [ ] Review ALL files
   [ ] Update activeContext.md and progress.md
   [ ] Check consistency across files
   [ ] Remove outdated information
   [ ] Add new context files if needed
   ```

## File-Specific Updates

### activeContext.md
- Current work focus
- Recent changes
- Active decisions
- Next steps
- Known issues

### progress.md
- Move items between sections
- Update completion status
- Add new issues
- Update next steps

### systemPatterns.md
- Technical decisions
- New patterns
- Interface updates
- Architecture changes

### techContext.md
- Dependency versions
- Technical constraints
- Setup instructions
- Security updates

### .cursorrules
- Implementation patterns
- User preferences
- Known challenges
- Project evolution

## Best Practices

### Do's
- Keep documentation concise
- Maintain consistent formatting
- Cross-reference between files
- Use project terminology
- Add new files for complex features

### Don'ts
- Leave outdated information
- Skip full reviews
- Ignore file dependencies
- Mix terminology
- Duplicate information

## Quick Commands
```bash
# View memory bank status
ls -la memory-bank/

# Check recent changes
git log --pretty=format:"%h %ad | %s" --date=short memory-bank/

# Review specific file
cat memory-bank/activeContext.md
```

Remember: Memory bank accuracy = project success 