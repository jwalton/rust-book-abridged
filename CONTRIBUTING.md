# Contributing

Please feel free to raise an issue or a pull request if you see something that needs fixing.

## Conventions Used in This Book

If not specified here, try to follow the style of "The Rust Programming Language".

Where possible, examples are copy-pasted directly from the original "The Rust Programming Language".  We don't add listing numbers to our listings unless we want to reference them later in the chapter.

For consistency, when talking about the language "Rust" we capitalize the first letter (never "rust").  In many places we refer to other languages in this book.  For consistency, we use "JavaScript", "TypeScript", "Java", "C", "C++", "Python", and "Go".

Chapter and section numbers are written using a heading and a hyphen:

```md
# 2 - Chapter 2 title goes here
## 2.1 - Section 2.1 title goes here
### A subsection of 2.1
```

We generally don't go more than three levels deep - if the original Rust book has something that would be a fourth-level header, we either just drop it or convert it to a third level header (this is supposed to be the abridged version, after all).

When linking to another chapter, we use the convention `[chapter 10][chap10]`.  All chapter links required are specified at the bottom of the file.  All chapter links are available in the `ch00-intro.md` file as well, so if any are missing in a given chapter, they can be copy-pasted from there.  Links to a specific section just link to the section.  For example:

```md
[`Option` enum](./ch06-enums-and-pattern-matching.md#the-option-enum-and-its-advantages-over-null-values)
```

File names, like _lib.rs_ should be italicized.

All .md files should pass markdownlint.
