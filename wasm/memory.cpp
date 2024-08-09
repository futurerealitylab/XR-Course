
#include "memory.hpp"
#include <bit>

namespace mem {

mem::Allocator Heap_Allocator(void)
{
    mem::Allocator allocator = {};
    allocator.data = NULL;
    
    allocator.allocate       = MTT_default_heap_allocate;
    allocator.deallocate     = MTT_default_heap_deallocate;
    allocator.resize         = MTT_default_heap_resize;
    allocator.deallocate_all = mem::alloc_deallocate_all_noop;

    return allocator;
}



// based on Box2D code:


static const usize32 BLOCK_SIZE_MAX = 16000;

// These are the supported object sizes. Actual allocations are rounded up the next size.
static const usize32 BLOCK_SIZES[BLOCK_SIZES_COUNT] = {
    16,        // 0
    32,        // 1
    64,        // 2
    96,        // 3
    128,    // 4
    160,    // 5
    192,    // 6
    224,    // 7
    256,    // 8
    320,    // 9
    384,    // 10
    448,    // 11
    512,    // 12
    640,    // 13
    1024, // 14
    1536, // 15
    2048, // 16
    3072, // 17
    4096, // 18
    5120, // 19
    6144, // 20
    7680, // 21
    8192, // 22
    10240, // 23
    12800, // 24
    BLOCK_SIZE_MAX, // 25
};

struct b2SizeMap
{
    constexpr b2SizeMap() : values()
    {
        int32 j = 0;
        values[0] = 0;
        for (int32 i = 1; i <= BLOCK_SIZE_MAX; ++i)
        {
            //ASSERT_MSG(j < BLOCK_SIZES_COUNT, "sizes mismatch\n");
            if (i <= BLOCK_SIZES[j])
            {
                values[i] = (uint8)j;
            }
            else
            {
                ++j;
                values[i] = (uint8)j;
            }
        }
    }
    
    uint8 values[BLOCK_SIZE_MAX + 1];
};

static const b2SizeMap block_size_map;

usize32 BLOCK_SIZE_LOOKUP(usize size)
{
    if (size <= BLOCK_SIZE_MAX) {
        return block_size_map.values[size];
    } else {
        return 0;
    }
}

// end




void Arena_allocate_chunk_(Arena* arena, usize size)
{
    void* data = arena->backing.allocate(&arena->backing, arena->chunk_size);
    ASSERT_MSG(data != NULL, "memory arena allocation error (failed to allocate data) %s", __PRETTY_FUNCTION__);
    
    Memory_Chunk* chunk = (Memory_Chunk*)data;
    
    chunk->memory = data;
    // inline chunk is a dummy to make logic simpler
    // set new chunk as head
    chunk->next = arena->chunk_list.next;
    arena->chunk_list.next = chunk;
    arena->chunk_count += 1;
    arena->cursor = align_up(sizeof(Memory_Chunk), arena->alignment);
    arena->current_chunk = chunk;
}

void* Arena_init(Arena* arena, Allocator backing, usize chunk_byte_count, usize alignment)
{
    //memset(arena, 0, sizeof(*arena));

    arena->backing     = backing;
    arena->alignment   = alignment;
    arena->chunk_count = 0;
    arena->cursor = 0;
    arena->total_size = 0;
    arena->chunk_idx = 0;
    arena->chunk_list.next = NULL;
    arena->current_chunk = NULL;
    
    arena->chunk_size = align_up(chunk_byte_count + sizeof(Memory_Chunk), alignment);

    Arena_allocate_chunk_(arena, arena->chunk_size);
    
    return NULL;
}

 
void Arena_clone_standard_layout(Arena* dst, Arena* src)
{
//    {
//        dst->alignment   = src->alignment;
//        dst->chunk_count = 0;
//        dst->cursor = 0;
//        dst->total_size = 0;
//        dst->chunk_idx = 0;
//        dst->chunk_list.next = NULL;
//        dst->current_chunk = NULL;
//        dst->chunk_size = src->chunk_size;
//    }
//    
//    Allocator* a = &dst->backing;
//    Memory_Chunk* curr = src->chunk_list.next;
//    while (curr != NULL) {
//        void* curr_mem = curr->memory;
//        
//        curr = curr->next;
//        
//        //memset(to_free, 0, arena->chunk_size);
//        
//        //a->deallocate(a, to_free, 1);
//        Arena_allocate_chunk_(dst);
//    }
}

void* Arena_allocate_proc(void* state, usize size)
{
    Arena* arena = (Arena*)(((mem::Allocator*)state)->data);
    usize allocation_size = align_up(size, arena->alignment);
    uintptr next_cursor = arena->cursor + allocation_size;
    //MTT_print("frame allocation: %llu\n", next_cursor);
    if (next_cursor >= arena->chunk_size) {
        if (arena->chunk_idx + 1 == arena->chunk_count) {
            Arena_allocate_chunk_(arena, allocation_size);
            // allocating a new chunk already sets the cursor
            //arena->cursor = align_up(sizeof(Memory_Chunk), arena->alignment);
            next_cursor = arena->cursor + allocation_size;
            arena->chunk_idx += 1;
        } else {
            arena->cursor = align_up(sizeof(Memory_Chunk), arena->alignment);
            next_cursor = arena->cursor + allocation_size;
            arena->chunk_idx += 1;
            arena->current_chunk = arena->current_chunk->next;
        }
    }
    
    void* memory = (void*)((uintptr)(arena->current_chunk->memory) + (uintptr)arena->cursor);
    
    arena->cursor      = next_cursor;
    arena->total_size += size;
    
    return memory;
}
void Arena_deallocate_all_proc(void* state, usize count)
{
    Arena* arena = (Arena*)(((mem::Allocator*)state)->data);
    
    Arena_deinit(arena);
    Arena_init(arena, arena->backing, arena->chunk_size, arena->alignment);
}

void Arena_deinit(Arena* arena)
{
    Allocator* a = &arena->backing;
    Memory_Chunk* curr = arena->chunk_list.next;
    while (curr != NULL) {
        void* to_free = curr->memory;
        
        curr = curr->next;

        //memset(to_free, 0, arena->chunk_size);

        a->deallocate(a, to_free, 1);
    }
    
    arena->cursor = 0;
    arena->current_chunk = NULL;
}

void Arena_rewind(Arena* arena)
{
    arena->cursor = align_up(sizeof(Memory_Chunk), arena->alignment);
    arena->chunk_idx = 0;
    arena->current_chunk = arena->chunk_list.next;
    arena->total_size = 0;
}

mem::Allocator Arena_Allocator(Arena* arena)
{
    mem::Allocator allocator = {};
    allocator.data = (void*)arena;

    allocator.allocate       = Arena_allocate_proc;
    allocator.deallocate     = deallocate_noop;
    allocator.deallocate_all = Arena_deallocate_all_proc;
    allocator.resize         = alloc_resize_noop;
    
    return allocator;
}


mem::Allocator Memory_Pool_Fixed_Allocator(Memory_Pool_Fixed* pool)
{
    mem::Allocator allocator = {};
    allocator.data = (void*)pool;
    
    allocator.allocate       = Memory_Pool_Fixed_allocate_proc;
    allocator.deallocate     = Memory_Pool_Fixed_deallocate_proc;
    allocator.deallocate_all = alloc_deallocate_all_noop;
    allocator.resize         = alloc_resize_noop;
    
    return allocator;
}


void Memory_Pool_Fixed_allocate_chunk_(Memory_Pool_Fixed* pool)
{
    void* data = pool->backing.allocate(&pool->backing, pool->chunk_size);
    ASSERT_MSG(data != NULL, "memory pool fixed allocation error (failed to allocate data) %s", __PRETTY_FUNCTION__);
    //memset(data, 0, pool->chunk_size);
    
    Memory_Chunk* chunk = (Memory_Chunk*)data;
    chunk->size = pool->chunk_size;
    
    // start the pool after the header, aligned to the block alignment
    void* curr = pointer_add(data, align_up(sizeof(chunk), pool->block_align));
    void* allocation_begin = curr;
    uintptr* end = NULL;
    
    // create an intrusive free list
    for (usize block_index = 0; block_index < pool->block_count - 1; block_index += 1) {
        uintptr* next = (uintptr*)curr;
        uintptr next_val = (uintptr)curr + (uint64)pool->actual_block_size;
        
        
        *next = next_val;
        curr  = pointer_add(curr, pool->actual_block_size);
    }
        
    end  = (uintptr*)curr;
    *end = (uintptr)NULL;
    
    // store the full allocated memory in the chunk
    chunk->memory = data;
    
    // inline chunk is a dummy to make logic simpler
    // set new chunk as head (chunk_list.next on the pool is just the head)
    chunk->next = pool->chunk_list.next;
    pool->chunk_list.next = chunk;
    
    // the free list should begin after the chunk header
    pool->free_list = allocation_begin;

        
    pool->chunk_count += 1;
}

void* Memory_Pool_Fixed_init(Memory_Pool_Fixed* pool, Allocator backing, usize num_blocks, usize block_size, usize block_align)
{
    //memset(pool, 0, sizeof(Memory_Pool_Fixed));
    usize actual_block_size = 0;
    
    //memset(pool, 0, sizeof(*pool));
    
    pool->backing     = backing;
    pool->block_size  = block_size;
    pool->block_align = block_align;
    pool->block_count = num_blocks;
    
    
    actual_block_size = align_up(block_size, block_align);
    pool->actual_block_size = actual_block_size;

    pool->chunk_list.next = NULL;
    pool->chunk_count = 0;
    pool->chunk_size = align_up(sizeof(Memory_Chunk) + (num_blocks * actual_block_size), block_align);

    Memory_Pool_Fixed_allocate_chunk_(pool);

    return NULL;
}

void* Memory_Pool_Fixed_allocate_proc(void* state, usize size)
{
    Memory_Pool_Fixed* pool = (Memory_Pool_Fixed*)(((mem::Allocator*)state)->data);
    
    if (size > pool->block_size) {
        return pool->backing.allocate(&pool->backing, align_up(size, pool->block_align));
    }
    void* ptr = NULL;
#ifndef NDEBUG
    bool allocated_new_chunk = false;
#endif
    if (pool->free_list == NULL) {
        Memory_Pool_Fixed_allocate_chunk_(pool);
#ifndef NDEBUG
        allocated_new_chunk = true;
#endif
    }
    
    uintptr next_free = *((uintptr*)pool->free_list);
    // get next free block
    ptr = pool->free_list;
    // set free list to refer to the next free block
    pool->free_list = (void*)next_free;
    pool->total_size += pool->block_size;
    //memset(ptr, 0, size);

    return ptr;
}

void Memory_Pool_Fixed_deallocate_proc(void* state, void* memory, usize count)
{
    if (memory == NULL) {
        return;
    }
    
    Memory_Pool_Fixed* pool = (Memory_Pool_Fixed*)(((mem::Allocator*)state)->data);
    
    if (count > pool->block_size) {
        return pool->backing.deallocate(&pool->backing, memory, count);
    }
    
    uintptr* next = (uintptr*)memory;
    *next = (uintptr)pool->free_list;
    pool->free_list = memory;
    pool->total_size -= pool->block_size;
}


void Memory_Pool_Fixed_deinit(Memory_Pool_Fixed* pool)
{    
    Allocator* a = &pool->backing;
    Memory_Chunk* curr = pool->chunk_list.next;
    while (curr != NULL) {
        void* to_free = curr->memory;
        
        curr = curr->next;

        //memset(to_free, 0, pool->chunk_size);
        
        a->deallocate(a, to_free, curr->size);
    }
}

void Pool_Allocation_init(Pool_Allocation* pool_allocation, mem::Allocator backing, usize initial_count, usize element_size, usize alignment)
{
    mem::Memory_Pool_Fixed_init(&pool_allocation->pool, backing, initial_count, element_size, alignment);
    
    pool_allocation->allocator = mem::Memory_Pool_Fixed_Allocator(&pool_allocation->pool);
}



void Pool_Allocation_deinit(Pool_Allocation* pool_allocation)
{
    mem::Memory_Pool_Fixed_deinit(&pool_allocation->pool);
}

template <typename T>
T *get_ptr(void *base, Offset_Pointer<T> ptr) {
    return (T *)((char *)base  + ptr.offset);
}

template <typename T>
T* get_array(void *base, Offset_Array<T> array, usize *length) {
    if (length) *length = array.length;

    return (T *)((char *)base  + array.offset);
}


void Fixed_Buckets_init(Fixed_Buckets* alloc, mem::Allocator backing, usize initial_counts)
{
    memset(alloc, 0, sizeof(*alloc));
    alloc->backing = backing;
    alloc->initial_counts = initial_counts;
}


void Buckets_Allocation_init(Buckets_Allocation* buckets_allocation, mem::Allocator backing, usize initial_counts)
{
    memset(buckets_allocation, 0, sizeof(*buckets_allocation));
    Fixed_Buckets_init(&buckets_allocation->buckets, backing, initial_counts);
    buckets_allocation->allocator.allocate   = Fixed_Buckets_Allocator_allocate_proc;
    buckets_allocation->allocator.deallocate = Fixed_Buckets_Allocator_deallocate_proc;
    buckets_allocation->allocator.data       = (void*)(&buckets_allocation->buckets);
}

void* Fixed_Buckets_Allocator_allocate_proc(void* state, usize size)
{
    //MTT_print("%s alloc size=%llu{\n", __PRETTY_FUNCTION__, size);
    Fixed_Buckets* buckets = (Fixed_Buckets*)(((mem::Allocator*)state)->data);
    
    if (size > BLOCK_SIZE_MAX) {
        return mem::allocate(&buckets->backing, size);
    }
    

    usize index = block_size_map.values[size];
    ASSERT_MSG(0 <= index && index < BLOCK_SIZES_COUNT, "block size mismatches!\n");
    //MTT_print("    index %llu\n", index);
    auto* bucket = &buckets->buckets[index];
    const usize32 size_adjusted = BLOCK_SIZES[index];
    //MTT_print("    size adjusted %u\n", size_adjusted);
    if (!buckets->is_init[index]) {
        buckets->is_init[index] = true;
        //MTT_print("    initializing bucket %llu\n", index);
        Pool_Allocation_init(bucket, buckets->backing, buckets->initial_counts, size_adjusted, 16);
    }
    //MTT_print("}\n");
    
    // ignore size param for this kind of allocation
    return bucket->allocator.do_allocate(size_adjusted);
}
void Fixed_Buckets_Allocator_deallocate_proc(void* state, void* memory, usize size)
{
    //MTT_print("%s alloc size=%llu{\n", __PRETTY_FUNCTION__, size);
    Fixed_Buckets* buckets = (Fixed_Buckets*)(((mem::Allocator*)state)->data);
    
    if (size > BLOCK_SIZE_MAX) {
        mem::deallocate(&buckets->backing, memory, size);
        return;
    }
    
    usize index = block_size_map.values[size];
    ASSERT_MSG(0 <= index && index < BLOCK_SIZES_COUNT, "block size mismatches!\n");
    //MTT_print("    index %llu\n", index);
    ASSERT_MSG(buckets->is_init[index], "Should be initialized!\n");
    
    auto* bucket = &buckets->buckets[index];
    const usize32 size_adjusted = BLOCK_SIZES[index];
    //MTT_print("    size adjusted %u\n", size_adjusted);
    
    // ignore size param for this kind of allocation
    bucket->allocator.do_deallocate(memory, size_adjusted);
}

void Fixed_Buckets_Allocator_clear(Fixed_Buckets* buckets)
{
    for (usize i = 0; i < BLOCK_SIZES_COUNT; i += 1) {
        if (!buckets->is_init[i]) {
            continue;
        }
        
        Pool_Allocation_deinit(&buckets->buckets[i]);
    }
}

void Buckets_Allocation_deinit(Buckets_Allocation* buckets_allocation)
{
    Fixed_Buckets_Allocator_clear(&buckets_allocation->buckets);
}


mem::Allocator* main_allocator = nullptr;
void set_main_allocator(Allocator* a)
{
    main_allocator = a;
}
mem::Allocator* get_main_allocator(void)
{
    return main_allocator;
}





}
