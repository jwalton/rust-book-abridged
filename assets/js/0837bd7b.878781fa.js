"use strict";(self.webpackChunkrust_book_abridged=self.webpackChunkrust_book_abridged||[]).push([[380],{3905:(e,t,a)=>{a.d(t,{Zo:()=>u,kt:()=>m});var r=a(7294);function n(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function o(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){n(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function s(e,t){if(null==e)return{};var a,r,n=function(e,t){if(null==e)return{};var a,r,n={},i=Object.keys(e);for(r=0;r<i.length;r++)a=i[r],t.indexOf(a)>=0||(n[a]=e[a]);return n}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)a=i[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(n[a]=e[a])}return n}var l=r.createContext({}),h=function(e){var t=r.useContext(l),a=t;return e&&(a="function"==typeof e?e(t):o(o({},t),e)),a},u=function(e){var t=h(e.components);return r.createElement(l.Provider,{value:t},e.children)},d="mdxType",p={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},c=r.forwardRef((function(e,t){var a=e.components,n=e.mdxType,i=e.originalType,l=e.parentName,u=s(e,["components","mdxType","originalType","parentName"]),d=h(a),c=n,m=d["".concat(l,".").concat(c)]||d[c]||p[c]||i;return a?r.createElement(m,o(o({ref:t},u),{},{components:a})):r.createElement(m,o({ref:t},u))}));function m(e,t){var a=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var i=a.length,o=new Array(i);o[0]=c;var s={};for(var l in t)hasOwnProperty.call(t,l)&&(s[l]=t[l]);s.originalType=e,s[d]="string"==typeof e?e:n,o[1]=s;for(var h=2;h<i;h++)o[h]=a[h];return r.createElement.apply(null,o)}return r.createElement.apply(null,a)}c.displayName="MDXCreateElement"},4327:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>l,contentTitle:()=>o,default:()=>p,frontMatter:()=>i,metadata:()=>s,toc:()=>h});var r=a(7462),n=(a(7294),a(3905));const i={sidebar_position:1,slug:"/",title:"The Rust Book (Abridged)",hide_title:!0},o=void 0,s={unversionedId:"ch00-intro",id:"ch00-intro",title:"The Rust Book (Abridged)",description:"The Rust Book (Abridged)",source:"@site/docs/ch00-intro.md",sourceDirName:".",slug:"/",permalink:"/rust-book-abridged/",draft:!1,editUrl:"https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/docs/ch00-intro.md",tags:[],version:"current",sidebarPosition:1,frontMatter:{sidebar_position:1,slug:"/",title:"The Rust Book (Abridged)",hide_title:!0},sidebar:"tutorialSidebar",next:{title:"1 - Getting Started",permalink:"/rust-book-abridged/ch01-getting-started"}},l={},h=[{value:"What is this?",id:"what-is-this",level:2},{value:"What&#39;s different about this book?",id:"whats-different-about-this-book",level:2},{value:"Table of Contents",id:"table-of-contents",level:2}],u={toc:h},d="wrapper";function p(e){let{components:t,...a}=e;return(0,n.kt)(d,(0,r.Z)({},u,a,{components:t,mdxType:"MDXLayout"}),(0,n.kt)("div",{align:"center"},(0,n.kt)("h1",null,"The Rust Book (Abridged)"),(0,n.kt)("p",null,"v1.0.0"),(0,n.kt)("p",null,"By Jason Walton"),(0,n.kt)("p",null,"Based on ",(0,n.kt)("a",{href:"https://doc.rust-lang.org/stable/book/"},'"The Rust Programming Language"')," by Steve Klabnik and Carol Nichols.")),(0,n.kt)("p",null,"PDF version of this book is available ",(0,n.kt)("a",{parentName:"p",href:"https://github.com/jwalton/rust-book-abridged/releases/latest/download/rust-book-abridged.pdf"},"here"),"."),(0,n.kt)("h2",{id:"what-is-this"},"What is this?"),(0,n.kt)("p",null,"This is an abridged - or perhaps a better word would be condensed - version of ",(0,n.kt)("a",{parentName:"p",href:"https://doc.rust-lang.org/stable/book/title-page.html"},'"The Rust Programming Language"')," (AKA \"the Rust Book\"). This is not an original work - all the chapter names and examples in this book have been copied verbatim from the original, but all of the prose has been rewritten from scratch, leaving out anything that's not about learning Rust. This book is about 1/2 the length of the original, but I don't think it is missing anything that an experienced software developer wouldn't already know."),(0,n.kt)("p",null,"The Rust Book is a great resource for learning Rust, especially if you're new to programming. If you fall into this category, then I strongly suggest you put this book down and go read it instead. But... the Rust Book is quite wordy. If you're already familiar with one or more other programming languages, then you are likely already familiar with a lot of the concepts the book covers, and you might benefit from this shorter version. If you are already familiar with ideas like the stack and the heap, with test driven development, with the ",(0,n.kt)("a",{parentName:"p",href:"https://en.wikipedia.org/wiki/Don%27t_repeat_yourself"},"DRY principle"),", then this might be a better read."),(0,n.kt)("p",null,"This isn't meant to be a criticism of the Rust Book. It's excellent and well written, and there's a reason why it's highly recommended. The problem here is not with the original book, but more a mismatch when it comes to intended audience."),(0,n.kt)("h2",{id:"whats-different-about-this-book"},"What's different about this book?"),(0,n.kt)("p",null,"As mentioned above, the chapter names in this book are all the same as in the original, and in many cases the subsections in each chapter are the same. In most cases examples have been copied directly from the original. Keeping the original structure and examples hopefully makes it easy to jump back and forth between this book and the original, in case there are places where this book is unclear or covers concepts you are not familiar with."),(0,n.kt)("p",null,"Where the original would build up a code example piece by piece, in most cases this version presents the finished code so you can read through it, and then points out some interesting parts. Where possible I've tried to add in material I think an advanced reader would find interesting. In some places this explains things in a different way than the original. This also adds an extra bonus chapter about async programming!"),(0,n.kt)("p",null,"I have a great deal of experience in TypeScript, Java, C/C++, Go, and a few other languages. I spent about two weeks putting this book together, reading the original, condensing it, and researching parts that weren't clear. Hopefully someone finds this useful! But I am new to Rust so if you find something that doesn't make sense, please feel free to ",(0,n.kt)("a",{parentName:"p",href:"https://github.com/jwalton/rust-book-abridged"},"raise an issue"),"."),(0,n.kt)("p",null,"This book was written entirely by a human - none of this is generated by ChatGPT."),(0,n.kt)("p",null,"If you enjoy this book, please ",(0,n.kt)("a",{parentName:"p",href:"https://github.com/jwalton/rust-book-abridged"},"give it a star on GitHub"),"."),(0,n.kt)("h2",{id:"table-of-contents"},"Table of Contents"),(0,n.kt)("ul",null,(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch01-getting-started",title:"Chapter 1: Getting Started"},"Chapter 1: Getting Started")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch02-guessing-game",title:"Chapter 2: Guessing Game"},"Chapter 2: Guessing Game")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch03-common-programming-concepts",title:"Chapter 3: Common Programming Concepts"},"Chapter 3: Common Programming Concepts")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch04-ownership",title:"Chapter 4: Ownership, References, and Slices"},"Chapter 4: Ownership, References, and Slices")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch05-structs",title:"Chapter 5: Using Structs to Structure Related Data"},"Chapter 5: Using Structs to Structure Related Data")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch06-enums-and-pattern-matching",title:"Chapter 6: Enums and Pattern Matching"},"Chapter 6: Enums and Pattern Matching")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch07-packages-crates-modules",title:"Chapter 7: Managing Growing Projects with Packages, Crates, and Modules"},"Chapter 7: Managing Growing Projects with Packages, Crates, and Modules")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch08-common-collections",title:"Chapter 8: Common Collections"},"Chapter 8: Common Collections")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch09-error-handling",title:"Chapter 9: Error Handling"},"Chapter 9: Error Handling")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch10/ch10-01-generic-data-types",title:"Chapter 10: Generic Types, Traits, and Lifetimes"},"Chapter 10: Generic Types, Traits, and Lifetimes")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch11-automated-tests",title:"Chapter 11: Writing Automated Tests"},"Chapter 11: Writing Automated Tests")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch12-io-project-cli",title:"Chapter 12: An I/O Project: Building a Command Line Program"},"Chapter 12: An I/O Project: Building a Command Line Program")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch13-functional-language-features",title:"Chapter 13: Functional Language Features: Iterators and Closures"},"Chapter 13: Functional Language Features: Iterators and Closures")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch14-more-about-cargo",title:"Chapter 14: More About Cargo and Crates.io"},"Chapter 14: More About Cargo and Crates.io")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch15-smart-pointers",title:"Chapter 15: Smart Pointers"},"Chapter 15: Smart Pointers")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch16-fearless-concurrency",title:"Chapter 16: Fearless Concurrency"},"Chapter 16: Fearless Concurrency")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch17-object-oriented-features",title:"Chapter 17: Object Oriented Features of Rust"},"Chapter 17: Object Oriented Features of Rust")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch18-patterns-and-matching",title:"Chapter 18: Patterns and Matching"},"Chapter 18: Patterns and Matching")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch19/ch19-01-unsafe",title:"Chapter 19: Advanced Features"},"Chapter 19: Advanced Features")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch20/ch20-01-single-threaded-web-server",title:"Chapter 20: Multithreaded Web Server"},"Chapter 20: Multithreaded Web Server")),(0,n.kt)("li",{parentName:"ul"},(0,n.kt)("a",{parentName:"li",href:"/rust-book-abridged/ch21-async",title:"Chapter 21: Bonus Chapter: Async Programming"},"Chapter 21: Bonus Chapter: Async Programming"))),(0,n.kt)("p",null,"(This version of this book is based on ",(0,n.kt)("a",{parentName:"p",href:"https://github.com/rust-lang/book/commit/c06006157b14b3d47b5c716fc392b77f3b2e21ce"},"commit c06006"),")."))}p.isMDXComponent=!0}}]);