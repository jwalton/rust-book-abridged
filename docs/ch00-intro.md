---
sidebar_position: 1
slug: /
title: "The Rust Book (Abridged)"
hide_title: true
---

<div align="center">
    <h1>The Rust Book (Abridged)</h1>
    <p>v0.0.2 - Draft</p>
    <p>By Jason Walton</p>
    <p>Based on <a href="https://github.com/rust-lang/book/commit/c06006157b14b3d47b5c716fc392b77f3b2e21ce">"The Rust Programming Language"</a> by Steve Klabnik and Carol Nichols.</p>
</div>

## Why an Abridged Version?

["The Rust Programming Language"](https://doc.rust-lang.org/stable/book/title-page.html) (AKA "the Rust Book") is a great resource for learning Rust, especially if you're new to programming. If you fall into this category, then I strongly suggest you put this book down and go read it instead.

But... the Rust Book is a bit wordy. It's an excellent introduction to Rust, but (fortunately or unfortunately, depending on your viewpoint) it's also an excellent introduction to many computer programming concepts. If you're already familiar with one or more other programming languages, then you are no doubt familiar with these concepts already.

Take, for example, this excerpt from the section on functions:

> We define a function in Rust by entering `fn` followed by a function name and a set of parentheses. The curly brackets tell the compiler where the function body begins and ends. We can call any function we've defined by entering its name followed by a set of parentheses.

If you're a veteran programmer, this paragraph is probably something you didn't need to read. The [start of chapter 10](https://doc.rust-lang.org/stable/book/ch10-00-generics.html#removing-duplication-by-extracting-a-function) essentially explains [DRY principal](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) at great length. [Chapter 12](https://doc.rust-lang.org/stable/book/ch12-04-testing-the-librarys-functionality.html) spends quite a few paragraphs devoted to learning about test driven development (TDD). This is all stuff you already know.

This isn't meant to be a criticism of the Rust Book. It's excellent and well written, and there's a reason I chose it as the basis for this book. The problem here is not with the original book, but more a mismatch when it comes to intended audience.

## What's different about this book?

This book is a rewrite of the Rust book, trying to make it less loquacious. The chapter names are all the same, and in many cases the subsections in each chapter are the same. In most cases examples have been copied directly from the original. This book tries to present information in the same order as the original Rust Book, but leaves out all the things an experienced developer would already know and focuses more on the parts that make Rust unique. (There's also an extra chapter about async Rust!)

Where the original would build up a code example piece by piece, in most cases this version presents the finished code so you can read through it, and then points out some interesting parts. Where possible I've tried to add in material I think an advanced reader would find interesting. In places where I found the original book confusing I've tried to explain things in a different way.

By using the same example code and keeping things in more or less the same order, the hope is that you can read this book, and if you come across something new or unclear, you can switch over to the original version of the Rust book and read the same section, with the exact same examples, and hopefully it will clear things up for you. (If this happens, please [raise an issue](https://github.com/jwalton/rust-book-abridged/issues) to let me know where you got lost so I can improve this version!)

:::caution

This book is a work-in-progress. I wrote this while I was reading "The Rust Programming Language" and learning Rust, so if there are things you find in here that you think are wrong, it's entirely possible that this is because they _are_ wrong! Again, please feel free to raise an issue, or a PR and let me know!

:::

If you enjoy this book, please [give it a star on GitHub](https://github.com/jwalton/rust-book-abridged), or [buy me a coffee](https://github.com/sponsors/jwalton).

## Table of Contents

- [Chapter 1: Getting Started][chap1]
- [Chapter 2: Guessing Game][chap2]
- [Chapter 3: Common Programming Concepts][chap3]
- [Chapter 4: Ownership, References, and Slices][chap4]
- [Chapter 5: Using Structs to Structure Related Data][chap5]
- [Chapter 6: Enums and Pattern Matching][chap6]
- [Chapter 7: Managing Growing Projects with Packages, Crates, and Modules][chap7]
- [Chapter 8: Common Collections][chap8]
- [Chapter 9: Error Handling][chap9]
- [Chapter 10: Generic Types, Traits, and Lifetimes][chap10]
- [Chapter 11: Writing Automated Tests][chap11]
- [Chapter 12: An I/O Project: Building a Command Line Program][chap12]
- [Chapter 13: Functional Language Features: Iterators and Closures][chap13]
- [Chapter 14: More About Cargo and Crates.io][chap14]
- [Chapter 15: Smart Pointers][chap15]
- [Chapter 16: Fearless Concurrency][chap16]
- [Chapter 17: Object Oriented Features of Rust][chap17]
- [Chapter 18: Patterns and Matching][chap18]
- [Chapter 19: Advanced Features][chap19]
- [Chapter 20: Multithreaded Web Server][chap20]
- [Chapter 21: Bonus Chapter: Async Programming][chap21]

[chap1]: ./ch01-getting-started.md "Chapter 1: Getting Started"
[chap2]: ./ch02-guessing-game.md "Chapter 2: Guessing Game"
[chap3]: ./ch03-common-programming-concepts.md "Chapter 3: Common Programming Concepts"
[chap4]: ./ch04-ownership.md "Chapter 4: Ownership, References, and Slices"
[chap5]: ./ch05-structs.md "Chapter 5: Using Structs to Structure Related Data"
[chap6]: ./ch06-enums-and-pattern-matching.md "Chapter 6: Enums and Pattern Matching"
[chap7]: ./ch07-packages-crates-modules.md "Chapter 7: Managing Growing Projects with Packages, Crates, and Modules"
[chap8]: ./ch08-common-collections.md "Chapter 8: Common Collections"
[chap9]: ./ch09-error-handling.md "Chapter 9: Error Handling"
[chap10]: ./ch10/ch10-01-generic-data-types.md "Chapter 10: Generic Types, Traits, and Lifetimes"
[chap11]: ./ch11-automated-tests.md "Chapter 11: Writing Automated Tests"
[chap12]: ./ch12-io-project-cli.md "Chapter 12: An I/O Project: Building a Command Line Program"
[chap13]: ./ch13-functional-language-features.md "Chapter 13: Functional Language Features: Iterators and Closures"
[chap14]: ./ch14-more-about-cargo.md "Chapter 14: More About Cargo and Crates.io"
[chap15]: ./ch15-smart-pointers.md "Chapter 15: Smart Pointers"
[chap16]: ./ch16-fearless-concurrency.md "Chapter 16: Fearless Concurrency"
[chap17]: ./ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
[chap18]: ./ch18-patterns-and-matching.md "Chapter 18: Patterns and Matching"
[chap19]: ./ch19/ch19-01-unsafe.md "Chapter 19: Advanced Features"
[chap20]: ./ch20/ch20-01-single-threaded-web-server.md "Chapter 20: Multithreaded Web Server"
[chap21]: ./ch21-async.md "Chapter 21: Bonus Chapter: Async Programming"
