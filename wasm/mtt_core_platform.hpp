void* default_heap_allocate(void* data, usize byte_count);
void default_heap_deallocate(void* data, void* memory, usize count);
void* default_heap_resize(void* data, void* memory, usize byte_count, usize old_byte_count);

void* MTT_default_heap_allocate(void* data, usize byte_count);
void MTT_default_heap_deallocate(void* data, void* memory, usize count);
void* MTT_default_heap_resize(void* data, void* memory, usize byte_count, usize old_byte_count);
