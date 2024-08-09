//
//  memory.hpp
//  Make The Thing
//
//  Created by Toby Rosenberg on 7/6/20.
//  Copyright © 2020 Toby Rosenberg. All rights reserved.
//

#ifndef memory_hpp
#define memory_hpp




namespace mem {

// several allocators and utility functions (e.g. Pool allocated) adapted from Ginger Bill's gb.h library
// see: https://github.com/gingerBill/gb

#define MEM_NODISCARD [[nodiscard]]

#ifndef align_up
#define align_up(num, align) \
    (((num) + ((align) - 1)) & ~((align) - 1))
#endif

static const usize32 BLOCK_SIZES_COUNT = 26;

inline static usize align_forward(usize num, usize align)
{
    return (((num) + ((align) - 1)) & ~((align) - 1));
}

static inline void* pointer_add(void *ptr, usize bytes)
{
    return (void*)((u8*)ptr + bytes);
}

static inline void* pointer_sub(void *ptr, isize bytes)
{
    return (void *)((u8*)ptr - bytes);
}

inline static void* align_up_ptr(void* ptr, isize alignment)
{
    uintptr p = (uintptr)ptr;
    
    return (void*)(((p) + ((alignment) - 1)) & ~((alignment) - 1));
}

MEM_NODISCARD
inline static void* malloc(size_t size)
{
    return ::malloc(size);
}

inline static void free(void* ptr)
{
    ::free(ptr);
}

MEM_NODISCARD
inline static void* realloc(void* ptr, size_t size, size_t old_size)
{
    return ::realloc(ptr, size);
}

MEM_NODISCARD
inline static void* aligned_alloc(size_t alignment, size_t size)
{
    const usize aligned_size = align_up(size, alignment);
    return ::aligned_alloc(alignment, aligned_size);
}

inline static void aligned_free(void* ptr)
{
    free(ptr);
}

MEM_NODISCARD
inline static void* aligned_realloc(void* ptr, size_t size, size_t old_size)
{
    void* mem = aligned_alloc(16, size);
    memcpy(mem, ptr, old_size);
    return mem;
}

MEM_NODISCARD
inline static void* aligned_calloc(size_t alignment, size_t count, size_t size)
{
    size_t aligned_size = align_up(size, alignment);
    void* out = aligned_alloc(alignment, aligned_size);
    memset(out, 0, aligned_size);
    return out;
}



typedef void* (*Fn_Memory_allocate)(void*, usize);
typedef void  (*Fn_Memory_deallocate)(void*, void*, usize);
typedef void* (*Fn_Memory_resize)(void*, void*, usize, usize);
typedef void  (*Fn_Memory_deallocate_all)(void*, usize);

static inline void* allocate_noop(void* _, usize __)
{
    return nullptr;
}

static inline void deallocate_noop(void* _, void* __, usize ___)
{
    return;
}

static inline void* alloc_resize_noop(void* _, void* __, usize ___, usize ____)
{
    return NULL;
}
static inline void  alloc_deallocate_all_noop(void* _, usize __)
{
    return;
}

#ifdef __cplusplus
struct Allocator {
#else
struct mem_Allocator {
#endif
    void* data;
    Fn_Memory_allocate       allocate;
    Fn_Memory_deallocate     deallocate;
    Fn_Memory_resize         resize;
    Fn_Memory_deallocate_all deallocate_all;
    
    usize alignment;

#ifdef __cplusplus
    MEM_NODISCARD
    inline void* do_allocate(usize byte_count)
    {
        return this->allocate(this, byte_count);
    }
    
    inline void do_deallocate(void* ptr, usize count)
    {
        this->deallocate(this, ptr, count);
    }
    
    MEM_NODISCARD
    inline void* do_resize(void* ptr, usize new_size, usize old_size)
    {
        return this->resize(this, ptr, new_size, old_size);
    }
    
    inline void do_deallocate_all(void* ptr, usize count)
    {
        this->deallocate_all(this, count);
    }
#endif
    
};

}

#ifdef __cplusplus
typedef mem::Allocator mem_Allocator;
#else
typedef struct mem_Allocator mem_Allocator;
#endif

#ifdef __cplusplus
namespace mem {
#else

#endif
typedef struct C_String {
    char* string;
    usize length;
} C_String;

static inline C_String C_String_make(mem_Allocator* allocator, usize byte_length)
{
    char* str = (char*)allocator->allocate(allocator, byte_length);
    return (C_String) {
        .string = str,
        .length = byte_length
    };
}
static inline void C_String_destroy(mem_Allocator* allocator, C_String* string)
{
    allocator->deallocate(allocator, string->string, string->length);
}

#ifdef __cplusplus
}
#else

#endif

namespace mem {


MEM_NODISCARD
inline static void* allocate(mem::Allocator* allocator, usize byte_count)
{
    return allocator->allocate(allocator, byte_count);
}

inline static void deallocate(mem::Allocator* allocator, void* ptr, usize count)
{
    allocator->deallocate(allocator, ptr, count);
}

MEM_NODISCARD
inline static void* resize(mem::Allocator* allocator, void* ptr, usize new_size, usize old_size)
{
    return allocator->resize(allocator, ptr, new_size, old_size);
}

inline static void deallocate_all(mem::Allocator* allocator, void* ptr, usize count)
{
    allocator->deallocate_all(allocator, count);
}

inline static mem::Allocator noop_allocator(void)
{
    static constexpr const mem::Allocator alloc = (mem::Allocator) {
        .data = nullptr,
        .allocate = allocate_noop,
        .deallocate = deallocate_noop,
        .resize = alloc_resize_noop,
        .deallocate_all = alloc_deallocate_all_noop,
        .alignment = 16,
    };

    return alloc;
}



mem::Allocator Heap_Allocator(void);

struct Memory_Chunk {
    void*  memory;
    
    Memory_Chunk* next;
    usize size;
};

typedef struct alignas(16) Arena {
    Allocator backing;
    
    usize total_size;

    usize alignment;

    usize chunk_size;
    usize chunk_count;
    Memory_Chunk chunk_list;
    Memory_Chunk* current_chunk;
    
    usize cursor;
    usize chunk_idx;
} Arena;

void* Arena_init(Arena* arena, Allocator backing, usize chunk_byte_count, usize alignment);
mem::Allocator Arena_Allocator(Arena* arena);
void* Arena_allocate_proc(void* state, usize size);
void  Arena_deallocate_all_proc(void* state, usize count);

void Arena_deinit(Arena* arena);

void Arena_rewind(Arena* arena);

typedef struct alignas(16) Memory_Pool_Fixed {
    Allocator backing;
    void*     free_list;
    
    usize     block_size;
    usize     block_align;
    
    usize     block_count;
    usize     actual_block_size;
    
    usize     total_size;
    
    usize     chunk_size;
    usize     chunk_count;
    
    Memory_Chunk chunk_list;
    
} Memory_Pool_Fixed;

typedef uint16_t offset_t;
#define PTR_OFFSET_SZ sizeof(offset_t)

mem::Allocator Memory_Pool_Fixed_Allocator(Memory_Pool_Fixed* pool);

void* Memory_Pool_Fixed_init(Memory_Pool_Fixed* pool, Allocator backing, usize num_blocks, usize block_size, usize block_align);

//inline static void internal_free__(gbAllocator a, void* ptr)
//{
//    if (ptr != NULL) {
//        a.proc(a.data, gbAllocation_Free, 0, 0, ptr, 0, GB_DEFAULT_ALLOCATOR_FLAGS);
//    }
//}
void* Memory_Pool_Fixed_allocate_proc(void* state, usize size);
void  Memory_Pool_Fixed_deallocate_proc(void* state, void* memory, usize count);

void Memory_Pool_Fixed_deinit(Memory_Pool_Fixed* pool);

struct Pool_Allocation {
    mem::Memory_Pool_Fixed pool;
    mem::Allocator         allocator;
};
void Pool_Allocation_init(Pool_Allocation* pool_allocation, mem::Allocator backing, usize initial_count, usize element_size, usize alignment);

template <typename T>
void Pool_Allocation_init(Pool_Allocation* pool_allocation, mem::Allocator backing, usize initial_count, usize alignment)
{
    Pool_Allocation_init(pool_allocation, backing, initial_count, sizeof(T), alignment);
}

void Pool_Allocation_deinit(Pool_Allocation* pool_allocation);

extern mem::Allocator* main_allocator;
void set_main_allocator(Allocator* a);
mem::Allocator* get_main_allocator(void);

constexpr const usize bucket_count = BLOCK_SIZES_COUNT;
struct alignas(16) Fixed_Buckets {
    Allocator backing;
    mem::Pool_Allocation buckets[bucket_count];
    bool is_init[bucket_count];
    usize initial_counts;
};
void Fixed_Buckets_init(Fixed_Buckets* alloc, mem::Allocator backing, usize initial_counts);
void* Fixed_Buckets_Allocator_allocate_proc(void* state, usize size);
void  Fixed_Buckets_Allocator_deallocate_proc(void* state, void* memory, usize size);
void Fixed_Buckets_Allocator_clear(Fixed_Buckets* buckets);


struct Buckets_Allocation {
    mem::Fixed_Buckets buckets;
    mem::Allocator     allocator;
    
};
void Buckets_Allocation_init(Buckets_Allocation* buckets_allocation, mem::Allocator backing, usize initial_counts);
void Buckets_Allocation_deinit(Buckets_Allocation* buckets_allocation);


template <class T> MEM_NODISCARD T* alloc_array(Allocator* a, usize count)
{
    T* mem = static_cast<T*>(a->allocate(a, sizeof(T) * count));
    if (mem == nullptr) {
        return nullptr;
    }
    
    return mem;
}

template <class T> MEM_NODISCARD T* allocate(Allocator* a)
{
    return static_cast<T*>(a->allocate(a, sizeof(T)));
}


template <class T> MEM_NODISCARD T* alloc_init_array(Allocator* a, usize count)
{
    T* mem = static_cast<T*>(a->allocate(a, sizeof(T) * count));
    if (mem == nullptr) {
        return nullptr;
    }
    
    for (usize i = 0; i < count; i += 1) {
        new (mem + i) T;
    }
    return mem;
}


template <class T> MEM_NODISCARD T* alloc_init(Allocator* a)
{
    return static_cast<T*>(mem::alloc_init_array<T>(a, 1));
}


template <class T, typename... Args> MEM_NODISCARD T* alloc_init_array(Allocator* a, usize count, Args&&... args)
{
    T* mem = static_cast<T*>(a->allocate(a, sizeof(T) * count));
    if (mem == nullptr) {
        return nullptr;
    }
    
    
    for (usize i = 0; i < count; i += 1) {
        new (mem + i) T(args...);
    }
    
    return mem;
}


template <class T, typename... Args> MEM_NODISCARD T* alloc_init(Allocator* a, Args&&... args)
{
    T* mem = static_cast<T*>(a->allocate(a, sizeof(T) * 1));
    if (mem == nullptr) {
        return nullptr;
    }
    
    new (mem) T(args...);
    
    return mem;
}

template <class T> void init_allocated(T* mem, usize count)
{
    if (mem == nullptr) {
        return;
    }
    
    for (usize i = 0; i < count; i += 1) {
        new (mem + i) T;
    }
}


template <class T> void deinit_array(Allocator* a, T* mem, usize count)
{
    if (mem == nullptr) {
        return;
    }
    
    for (usize i = 0; i < count; i += 1) {
        (mem + i)->~T();
    }
}

template <class T> void deallocate_array(Allocator* a, T* mem, usize count)
{
    if (mem == nullptr) {
        return;
    }
    a->deallocate(a, mem, count * sizeof(T));
}



template <class T> void deinit_deallocate_array(Allocator* a, T* mem, usize count)
{
    if (mem == nullptr) {
        return;
    }
    
    for (usize i = 0; i < count; i += 1) {
        (mem + i)->~T();
    }
    
    a->deallocate(a, mem, count * sizeof(T));
}

template <class T> void deallocate(Allocator* a, T* mem)
{
    mem::deallocate_array<T>(a, mem, 1);
}

#if defined(__OBJC__)
void* objc_id_allocate(void* data, usize byte_count);

void objc_id_deallocate(void* data, void* memory, usize count);


void* objc_id_resize(void* data, void* memory, usize count, usize old_count);
#endif


template <typename T>
struct Offset_Pointer {
    uint32_t offset;
};

template <typename T>
T *get_ptr(void *base, Offset_Pointer<T> ptr);

template <typename T>
struct Offset_Array {
    uint32_t offset;
    usize length;
};

template <typename T>
T* get_array(void *base, Offset_Array<T> array, usize *length);

usize32 BLOCK_SIZE_LOOKUP(usize size);

}


#undef MEM_NODISCARD


#endif /* memory_h */
