# 20.3 - Graceful Shutdown and Cleanup

Right now when we hit CTRL-C to send an interrupt signal to our web server, it stops running, but it also stops any in-flight requests. Let's see if we can get our server to shut down gracefully.

The basic strategy here is going to be to implement the `Drop` trait on `ThreadPool`. When the `ThreadPool` is dropped, we'll signal all the threads that they should stop accepting new requests and quit, and then we'll call `join` on each one to give them the time they need to finish up.

If you're looking for the full source for this project, it's [in the GitHub repo](https://github.com/jwalton/rust-book-abridged/examples/ch20-graceful-shutdown)

## Implementing the `Drop` Trait on `ThreadPool`

One problem we're going to run into is that, in order to call `thread.join()`, we're going to have to move the `thread` out of the `Worker`. We can't move _part_ of a struct, so we're going to have to use the same trick we did in [chapter 17][chap17] and store the thread in an `Option` so we can set it to `None`.

Calling `join` isn't enough though. This will wait until each thread quits, but right now the closure in each thread is an infinite loop! We need to somehow signal to the `Worker`'s thread that it should stop accepting new jobs. We can do this by dropping the `sender` half of the channel. This will cause the receiver to wake up and return an error. We'll have to pull the same trick we did with `thread` and store the `sender` in an `Option` to make this work. We'll also want to handle the error from `recv` correctly instead of just panicking.

Here's the updated library:

```rust title="src/lib.rs"
use std::{
    sync::{mpsc, Arc, Mutex},
    thread::{self, JoinHandle},
};

type Job = Box<dyn FnOnce() + Send + 'static>;

pub struct ThreadPool {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job>>,
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
            sender: Some(sender),
        }
    }

    pub fn execute<F>(&self, f: F)
    where
        F: FnOnce() + Send + 'static,
    {
        // Send our job to a Worker.
        let job = Box::new(f);
        self.sender.as_ref().unwrap().send(job).unwrap();
    }
}

impl Drop for ThreadPool {
    fn drop(&mut self) {
        // Drop the sender to force all the workers to finish up.
        drop(self.sender.take());

        for worker in &mut self.workers {
            println!("Shutting down worker {}", worker.id);

            // If there's a thread in this worker, wait for
            // it to finish.  If thread is None, there's
            // nothing to clean up.
            if let Some(thread) = worker.thread.take() {
                thread.join().unwrap();
            }
        }
    }
}

struct Worker {
    id: usize,
    thread: Option<JoinHandle<()>>,
}

impl Worker {
    fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Worker {
        let thread = thread::spawn(move || loop {
            let message = receiver.lock().unwrap().recv();

            match message {
                Ok(job) => {
                    println!("Worker {id} got a job; executing.");
                    job();
                }
                Err(_) => {
                    println!("Worker {id} disconnected; shutting down.");
                    break;
                }
            }
        });

        Worker {
            id,
            thread: Some(thread),
        }
    }
}
```

Now we just need some way to make the server shut down. A simple way to do this for testing is to modify `main`:

```rust title="src/main.rs"
    // --snip--
    for stream in listener.incoming().take(2) {
    // --snip--
```

Now our server will shut down after two requests.

## Next Steps

The original Rust book has some suggestions about places you could take this project further:

> - Add more documentation to ThreadPool and its public methods.
> - Add tests of the library's functionality.
> - Change calls to unwrap to more robust error handling.
> - Use ThreadPool to perform some task other than serving web requests.
> - Find a thread pool crate on crates.io and implement a similar web server using the crate instead. Then compare its API and robustness to the thread pool we implemented.

Another fun one might be to try to hook the SIGINT and SIGTERM signals so a CTRL-C will cause the server to shut down gracefully.

[chap17]: ../ch17-object-oriented-features.md "Chapter 17: Object Oriented Features of Rust"
