# 20.2 - Turning Our Single-Threaded Server into a Multithreaded Server

## Simulating a Slow Request in the Current Server Implementation

Since our web server is single threaded, it will completely handle one request before moving on to the next request in the queue. If we had a request that took a long time to process, it would hold up all the subsequent requests.

```rust title="src/main.rs"
use std::{
    fs,
    io::{prelude::*, BufReader},
    net::{TcpListener, TcpStream},
    thread,
    time::Duration,
};

// --snip--

fn handle_connection(mut stream: TcpStream) {
    // --snip--

    match &request_line[..] {
        "GET / HTTP/1.1" => send_response(stream, 200, "OK", "hello.html"),
        "GET /sleep HTTP/1.1" => {
            thread::sleep(Duration::from_secs(5));
            send_response(stream, 200, "OK", "hello.html");
        }
        _ => send_response(stream, 404, "NOT FOUND", "404.html")
    }

    // --snip--
}
```

We've switched from an `if` to a `match`, and added a "/sleep" route. We have to pass `&request_line[..]` to the match expression to explicitly convert it to a slice here, because `match` doesn't do automatic dereferencing like the equality method does.

The important thing here is, if you open up your browser and try to load [http://localhost:7878/sleep](http://localhost:7878/sleep), it'll take about five seconds for the page to load. If you tap CTRL-R to reload the page twice in quick succession, it will take about 10 seconds! Your browser sent two requests, and is waiting for the second one to finish.

## Spawning New Threads

We could solve this problem by just creating a new thread for each incoming connection:

```rust
for stream in listener.incoming() {
    let stream = stream.unwrap();

    thread::spawn(|| {
        handle_connection(stream);
    });
}
```

## Improving Throughput with a Thread Pool

Starting up an OS level thread has some costs associated with it, and if we start up too many of them we may run out of system resources, so a common pattern for a situation like this is to use a _thread pool_. We pre-allocate a number of threads that will be sitting idle, and then whenever a request comes in we hand it off to an idle worker from the pool.

```rust
let pool = ThreadPool::new(4);
for stream in listener.incoming() {
    let stream = stream.unwrap();

    pool.execute(|| {
        handle_connection(stream);
    });
}
```

That's all there is too it! Except... wait... Rust can't find the `ThreadPool` symbol. We'll have to bring it into scope to use it, but before that we'll have to build a ThreadPool!

## Building a ThreadPool

Before we show the code for a ThreadPool, let's take a moment to think through what it's going to look like.

We want to store a collection of threads. We won't know the number of threads until runtime so a vector is a reasonable choice here, but what exactly is being stored in the vector? How do you store a thread? If we have a look at the signature for `thread::spawn`:

```rust
pub fn spawn<F, T>(f: F) -> JoinHandle<T>
where
    F: FnOnce() -> T,
    F: Send + 'static,
    T: Send + 'static,
{
    // --snip--
}
```

We can see it returns a `JoinHandle<T>`. The `T` here is the type the thread will "return" when it completes, but our threads are never going to complete, so we'll store a `Vec<JoinHandle<()>>`. Actually, in order to make our lives a little easier at debugging time, we'll give each thread a unique ID and combine ID and `JoinHandle<()>` into a `Worker` and then store a `Vec<Worker>`.

Here's what the `Worker` is going to look like:

```rust
struct Worker {
    id: usize,
    thread: JoinHandle<()>,
}

impl Worker {
    /// Create a new Worker with the given id.
    pub fn new(id: usize) -> Worker {
        let thread = thread::spawn(|| {
            // TODO: ???
        });

        Worker { id, thread }
    }
}
```

We're going to execute jobs on these threads, but what's a job? We already know they are closures. Since we want our API to be similar to `thread::spawn`, a job is going to be the same as type `F` above. It'll be `FnOnce()` since it's a function we want to call exactly once. It will also need to be `Send` so we can transfer it to our worker thread, and `'static` because we don't know how long the thread will take to run. So we'll define a `Job` as:

```rust
type Job = Box<dyn FnOnce() + Send + 'static>;
```

Whenever we call `pool.execute` and pass in a job, we want that job to be run by a free thread from the pool. How does this happen? What happens inside the thread we spawn inside the Worker? We've conveniently left this out of our `Worker` above. There are many ways we could do this, but the approach we will use here is to send each job we want to execute to a worker over a channel.

Each `Worker` will hang on to the receiver side of a channel. The thread inside a `Worker` can just iterate on the channel and execute each job it receives in series. But you may recall that the channels we've been using are from the `mpsc` library, which stands for "multiple producers, single consumer". If we're creating four threads, we could create four channels and give one receiver from each to each worker. In this case, though, we'd have to decide which sender to send a new job to. How do we know which threads are free to accept new jobs?

What we really want here is the other way around: "single producer, multiple consumers". We know how to share a variable between multiple threads though; instead of having multiple channels, we can have just a single channel. We can wrap the receiver in a `Mutex`, and then wrap that in an `Arc`, and multiple threads will be able to safely call into the receiver one-at-a-time to fetch jobs.

Here's the code:

```rust title="src/lib.rs"
use std::{
    sync::{mpsc, Arc, Mutex},
    thread::{self, JoinHandle},
};

type Job = Box<dyn FnOnce() + Send + 'static>;

pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: mpsc::Sender<Job>,
}

impl ThreadPool {
    /// Create a new ThreadPool.
    ///
    /// The size is the number of threads in the pool.
    ///
    /// # Panics
    ///
    /// The `new` function will panic if the size is zero.
    pub fn new(size: usize) -> ThreadPool {
        // Make sure `size` is valid.
        assert!(size > 0);

        // Create our sender and receiver
        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));

        // Create a new vector.  Pre-allocate the vector
        // to be of length `size` so we know it can store
        // all of our threads.
        let mut workers = Vec::with_capacity(size);

        for id in 0..size {
            workers.push(Worker::new(id, Arc::clone(&receiver)));
        }

        ThreadPool {
            workers,
            sender,
        }
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        // Send our job to a Worker.
        let job = Box::new(f);
        self.sender.send(job).unwrap();
    }
}

struct Worker {
    id: usize,
    thread: JoinHandle<()>,
}

impl Worker {
    /// Create a new Worker with the given id.
    pub fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let job = receiver.lock().unwrap().recv().unwrap();
            println!("Worker {id} got a job; executing.");
            job();
        });

        Worker { id, thread }
    }
}
```

If you give this a try, it should work (although you'll get some compiler warnings)! If you visit "/sleep", wait for it to load, and then double-tap "CTRL-R" to reload the page, the page should reload in about five seconds instead of ten. If you're running into problems, check out the [code in the GitHub repo](https://github.com/jwalton/rust-book-abridged/examples/ch20-multi-threaded-web-server).

One thing you might have expected us to do in the worker was:

```rust
    let thread = thread::spawn(move || loop {
        // This is not so good...
        for job in receiver.lock().unwrap().iter() {
            println!("Worker {id} got a job; executing.");
            job();
        }
    });
```

If you give this a try, it will appear to work, but our "double-reload" example will be back to ten seconds again.  Why?  Because this code is equivalent to:

```rust
    let thread = thread::spawn(move || loop {
        // Take the lock on the mutex...
        let rx = receiver.lock().unwrap();
        // Then loop forever, never giving up the lock.
        for job in rx.iter() {
            println!("Worker {id} got a job; executing.");
            job();
        }
    });
```

We'll end up with one of our threads doing all the work.

There are also a few things wrong with this code as it stands.  First, we're obviously glossing over some error handling, which is fine for this example.  Second, if you reload the "/sleep" route many times, you'll find eventually it will start taking a long time to load.  What's happening here is that we're queueing up jobs in the channel.

Ideally if all the workers are busy, we'd return a 503 to let the client know we are too busy to handle the request.  We could do this in a few ways; we could use the `atomic` package to increment a counter when we start a job and decrement it when we finish one, so we know how many jobs are in progress.  There's also a `channel::sync_channel` which allows creating a channel with a bounded size. The sender in this case has a `try_send` which will return an error if the channel is full.

Next we'll look at how to adapt our web server to [shut down gracefully](ch20-03-graceful-shutdown.md).
